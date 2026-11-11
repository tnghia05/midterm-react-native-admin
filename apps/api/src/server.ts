import 'dotenv/config';
import { timingSafeEqual } from 'node:crypto';
import dns from 'node:dns';
import { readFile, writeFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose, { isObjectIdOrHexString } from 'mongoose';
import { Product } from './product.model.js';
import { isR2Configured, uploadDataImageToR2 } from './r2.js';
import { parseProductInput } from './validation.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const app = express();
const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '0.0.0.0';
const jwtSecret = process.env.JWT_SECRET ?? 'development-secret-change-this-value-now';
const seedPath = new URL('../data/products.json', import.meta.url);

app.use(cors());
app.use(express.json({ limit: '4mb' }));

async function syncExportFile() {
  const docs = await Product.find({}, { _id: 0, name: 1, price: 1, soluong: 1, image: 1 }).sort({ _id: -1 }).lean();
  await writeFile(seedPath, `${JSON.stringify(docs, null, 2)}\n`, 'utf8').catch(() => undefined);
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

app.get('/api/health', (_request, response) => response.json({ status: 'ok', database: mongoose.connection.name, r2: isR2Configured(), lanIps: detectLanIps() }));

app.post('/api/products/bulk', requireAuth, async (request, response, next) => {
  try {
    if (!Array.isArray(request.body) || request.body.length === 0 || request.body.length > 50) {
      return response.status(400).json({ message: 'Cần truyền mảng 1–50 sản phẩm hợp lệ' });
    }
    const items = await Promise.all(request.body.map(async (raw) => {
      const parsed = parseProductInput(raw);
      parsed.image = await uploadDataImageToR2(parsed.image);
      return parsed;
    }));
    const created = await Product.insertMany(items);
    await syncExportFile();
    response.status(201).json(created);
  } catch (error) { next(error); }
});

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
  try { response.json(await Product.find().sort({ _id: -1 }).lean()); } catch (error) { next(error); }
});

app.post('/api/products', requireAuth, async (request, response, next) => {
  try {
    const input = parseProductInput(request.body);
    input.image = await uploadDataImageToR2(input.image);
    const created = await Product.create(input);
    await syncExportFile();
    response.status(201).json(created);
  } catch (error) { next(error); }
});

app.patch('/api/products/:id', requireAuth, async (request, response, next) => {
  try {
    if (!isObjectIdOrHexString(request.params.id)) return response.status(400).json({ message: 'ID không hợp lệ' });
    const input = parseProductInput(request.body);
    input.image = await uploadDataImageToR2(input.image);
    const product = await Product.findByIdAndUpdate(request.params.id, input, { new: true, runValidators: true });
    if (!product) return response.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    await syncExportFile();
    response.json(product);
  } catch (error) { next(error); }
});

app.delete('/api/products/:id', requireAuth, async (request, response, next) => {
  try {
    if (!isObjectIdOrHexString(request.params.id)) return response.status(400).json({ message: 'ID không hợp lệ' });
    if (!await Product.findByIdAndDelete(request.params.id)) return response.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    await syncExportFile();
    response.status(204).end();
  } catch (error) { next(error); }
});

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  const message = error instanceof Error ? error.message : 'Không xử lý được yêu cầu';
  response.status(400).json({ message });
});

await mongoose.connect(process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/midterm_product_admin');
if (await Product.countDocuments() === 0) {
  const raw = JSON.parse(await readFile(seedPath, 'utf8')) as unknown[];
  await Product.insertMany(raw.map(parseProductInput));
}
await syncExportFile();
app.listen(port, host, () => console.log(`API đang chạy tại http://${host}:${port}`));
