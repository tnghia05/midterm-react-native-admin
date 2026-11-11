import { Schema, model } from 'mongoose';

export const ProductSchema = new Schema({
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 160 },
  price: { type: Number, required: true, min: 0, max: 1_000_000_000 },
  soluong: { type: Number, required: true, min: 0, max: 1_000_000 },
  image: { type: String, required: true, maxlength: 3_000_000 },
}, {
  collection: 'products',
  strict: 'throw',
  timestamps: false,
  versionKey: false,
});

ProductSchema.path('price').validate(Number.isSafeInteger, 'price phải là số nguyên');
ProductSchema.path('soluong').validate(Number.isSafeInteger, 'soluong phải là số nguyên');
ProductSchema.path('image').validate((value: string) =>
  /^https?:\/\//i.test(value) || /^data:image\/(?:png|jpe?g|webp);base64,/i.test(value),
  'image phải là URL hoặc ảnh từ thiết bị');

export const Product = model('Product', ProductSchema);
