import 'dotenv/config';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import dns from 'node:dns';
import { readFile, writeFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose, { isObjectIdOrHexString } from 'mongoose';
import { Product } from './product.model.js';
import { isR2Configured, uploadDataImageToR2 } from './r2.js';
import { parseProductInput, type ProductInput } from './validation.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const app = express();
const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '0.0.0.0';
const jwtSecret = process.env.JWT_SECRET ?? 'development-secret-change-this-value-now';
const seedPath = new URL('../data/products.json', import.meta.url);

app.use(cors());
app.use(express.json({ limit: '4mb' }));

type StoredProduct = ProductInput & { _id: string };
let memoryProducts: StoredProduct[] = [];
let mongoConnected = false;

function stableId(seed: string): string {
  return createHash('sha1').update(seed).digest('hex').slice(0, 24);
}

async function loadLocalSeed(): Promise<StoredProduct[]> {
  try {
    const raw = JSON.parse(await readFile(seedPath, 'utf8')) as unknown[];
    return raw.map((item, idx) => {
      const parsed = parseProductInput(item);
      return { _id: stableId(`${parsed.name}-${idx}`), ...parsed };
    });
  } catch {
    return [];
  }
}

async function saveLocalFile(items: ProductInput[]) {
  const clean = items.map(({ name, price, soluong, image }) => ({ name, price, soluong, image }));
  await writeFile(seedPath, `${JSON.stringify(clean, null, 2)}\n`, 'utf8').catch(() => undefined);
}

async function syncFromMongo() {
  const docs = await Product.find().sort({ _id: -1 }).lean();
  memoryProducts = docs.map((d) => ({
    _id: String(d._id),
    name: d.name,
    price: d.price,
    soluong: d.soluong,
    image: d.image,
  }));
  await saveLocalFile(memoryProducts);
}

function isAtlasNetworkError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /SSL alert number 80|tlsv1 alert|ServerSelection|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|Topology|buffering timed out|not connected/i.test(msg);
}

function sameText(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function requireAuth(request: Request, response: Response, next: NextFunction) {
  const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return response.status(401).json({ message: 'Bạn cần đăng nhập' });
  try { jwt.verify(token, jwtSecret); next(); }
  catch { response.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' }); }
}

function detectLanIps(): string[] {
  const nets = networkInterfaces();
  const ips: string[] = [];
  for (const [name, list] of Object.entries(nets)) {
    if (/loopback|vmware|vethernet|virtualbox|wsl/i.test(name)) continue;
    for (const info of list ?? []) {
      if (info.family === 'IPv4' && !info.internal && !info.address.startsWith('169.254.')) {
        ips.push(info.address);
      }
    }
  }
  return ips.length ? ips : ['192.168.1.13'];
}

app.get('/api/health', (_request, response) =>
  response.json({
    status: 'ok',
    database: mongoConnected ? mongoose.connection.name || 'midterm_product_admin' : 'products.json (fallback)',
    mongoConnected,
    r2: isR2Configured(),
    lanIps: detectLanIps(),
  }),
);

app.post('/api/auth/login', (request, response) => {
  const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  const password = typeof request.body?.password === 'string' ? request.body.password : '';
  const expectedEmail = (process.env.ADMIN_EMAIL ?? 'admin@example.com').toLowerCase();
  const expectedPassword = process.env.ADMIN_PASSWORD ?? 'Admin@12345';
  if (!sameText(email, expectedEmail) || !sameText(password, expectedPassword)) {
    return response.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
  }
  const token = jwt.sign({ role: 'admin', email }, jwtSecret, { expiresIn: '8h', issuer: 'midterm-product-admin' });
  response.json({ token, user: { email, role: 'admin' } });
});

app.get('/api/products', requireAuth, async (_request, response, next) => {
  try {
    if (mongoConnected) {
      try {
        await syncFromMongo();
        return response.json(memoryProducts);
      } catch (err) {
        if (!isAtlasNetworkError(err)) throw err;
        mongoConnected = false;
      }
    }
    response.json(memoryProducts);
  } catch (error) { next(error); }
});

app.post('/api/products', requireAuth, async (request, response, next) => {
  try {
    const input = parseProductInput(request.body);
    input.image = await uploadDataImageToR2(input.image);
    if (mongoConnected) {
      try {
        const created = await Product.create(input);
        await syncFromMongo();
        return response.status(201).json(created);
      } catch (err) {
        if (!isAtlasNetworkError(err)) throw err;
        mongoConnected = false;
      }
    }
    const created: StoredProduct = { _id: randomBytes(12).toString('hex'), ...input };
    memoryProducts = [created, ...memoryProducts];
    await saveLocalFile(memoryProducts);
    response.status(201).json(created);
  } catch (error) { next(error); }
});

app.post('/api/products/bulk', requireAuth, async (request, response, next) => {
  try {
    if (!Array.isArray(request.body) || request.body.length === 0 || request.body.length > 50) {
      return response.status(400).json({ message: 'Cần truyền mảng 1–50 sản phẩm hợp lệ' });
    }
    const items = await Promise.all(
      request.body.map(async (raw) => {
        const parsed = parseProductInput(raw);
        parsed.image = await uploadDataImageToR2(parsed.image);
        return parsed;
      }),
    );
    if (mongoConnected) {
      try {
        const created = await Product.insertMany(items);
        await syncFromMongo();
        return response.status(201).json(created);
      } catch (err) {
        if (!isAtlasNetworkError(err)) throw err;
        mongoConnected = false;
      }
    }
    const created: StoredProduct[] = items.map((item) => ({ _id: randomBytes(12).toString('hex'), ...item }));
    memoryProducts = [...created, ...memoryProducts];
    await saveLocalFile(memoryProducts);
    response.status(201).json(created);
  } catch (error) { next(error); }
});

app.patch('/api/products/:id', requireAuth, async (request, response, next) => {
  try {
    if (!isObjectIdOrHexString(request.params.id)) return response.status(400).json({ message: 'ID không hợp lệ' });
    const input = parseProductInput(request.body);
    input.image = await uploadDataImageToR2(input.image);
    if (mongoConnected) {
      try {
        const product = await Product.findByIdAndUpdate(request.params.id, input, { new: true, runValidators: true });
        if (product) {
          await syncFromMongo();
          return response.json(product);
        }
      } catch (err) {
        if (!isAtlasNetworkError(err)) throw err;
        mongoConnected = false;
      }
    }
    const idx = memoryProducts.findIndex((p) => p._id === request.params.id);
    if (idx === -1) return response.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    const updated: StoredProduct = { _id: request.params.id, ...input };
    memoryProducts[idx] = updated;
    await saveLocalFile(memoryProducts);
    response.json(updated);
  } catch (error) { next(error); }
});

app.delete('/api/products/:id', requireAuth, async (request, response, next) => {
  try {
    if (!isObjectIdOrHexString(request.params.id)) return response.status(400).json({ message: 'ID không hợp lệ' });
    if (mongoConnected) {
      try {
        const deleted = await Product.findByIdAndDelete(request.params.id);
        if (deleted) {
          await syncFromMongo();
          return response.status(204).end();
        }
      } catch (err) {
        if (!isAtlasNetworkError(err)) throw err;
        mongoConnected = false;
      }
    }
    const before = memoryProducts.length;
    memoryProducts = memoryProducts.filter((p) => p._id !== request.params.id);
    if (memoryProducts.length === before) return response.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    await saveLocalFile(memoryProducts);
    response.status(204).end();
  } catch (error) { next(error); }
});

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  const message = error instanceof Error ? error.message : 'Không xử lý được yêu cầu';
  response.status(400).json({ message });
});

memoryProducts = await loadLocalSeed();

async function connectMongoWithRetry() {
  const uri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/midterm_product_admin';
  try {
    await mongoose.connect(uri, { family: 4, serverSelectionTimeoutMS: 5000 });
    mongoConnected = true;
    if ((await Product.countDocuments()) === 0 && memoryProducts.length > 0) {
      await Product.insertMany(memoryProducts.map(({ name, price, soluong, image }) => ({ name, price, soluong, image })));
    } else if (memoryProducts.length > 0) {
      // Ensure local changes made while offline are synced if Mongo has fewer items
      const mongoCount = await Product.countDocuments();
      if (mongoCount !== memoryProducts.length) {
        await Product.deleteMany({});
        await Product.insertMany(memoryProducts.map(({ name, price, soluong, image }) => ({ name, price, soluong, image })));
      }
    }
    await syncFromMongo();
    console.log('Đã kết nối và đồng bộ MongoDB Atlas thành công.');
  } catch (error) {
    mongoConnected = false;
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`MongoDB Atlas chưa cho phép IP hiện tại (${reason.slice(0, 90)}) -> đang chạy bằng products.json cục bộ và tự thử lại sau 15s.`);
    setTimeout(() => void connectMongoWithRetry(), 15000);
  }
}

app.listen(port, host, () => {
  console.log(`API đang chạy tại http://${host}:${port}`);
  void connectMongoWithRetry();
});
