export type ProductInput = { name: string; price: number; soluong: number; image: string };

export function parseProductInput(value: unknown): ProductInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Dữ liệu không hợp lệ');
  const body = value as Record<string, unknown>;
  const allowed = ['name', 'price', 'soluong', 'image'];
  if (Object.keys(body).some((key) => !allowed.includes(key))) throw new Error('Chỉ chấp nhận name, price, soluong, image');
  if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 160) throw new Error('Tên sản phẩm cần 1–160 ký tự');
  if (!Number.isSafeInteger(body.price) || Number(body.price) < 0 || Number(body.price) > 1_000_000_000) throw new Error('Giá phải là số nguyên không âm');
  if (!Number.isSafeInteger(body.soluong) || Number(body.soluong) < 0 || Number(body.soluong) > 1_000_000) throw new Error('Số lượng phải là số nguyên không âm');
  if (typeof body.image !== 'string' || body.image.length > 3_000_000 ||
    !(/^https?:\/\//i.test(body.image) || /^data:image\/(?:png|jpe?g|webp);base64,/i.test(body.image))) throw new Error('Ảnh không hợp lệ');
  return { name: body.name.trim(), price: body.price as number, soluong: body.soluong as number, image: body.image };
}
