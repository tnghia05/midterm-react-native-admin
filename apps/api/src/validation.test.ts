import assert from 'node:assert/strict';
import test from 'node:test';
import { parseProductInput } from './validation.js';

test('chỉ nhận đúng bốn trường của đề bài', () => {
  const value = parseProductInput({ name: 'Serum', price: 299000, soluong: 9, image: 'https://example.com/a.jpg' });
  assert.deepEqual(value, { name: 'Serum', price: 299000, soluong: 9, image: 'https://example.com/a.jpg' });
  assert.throws(() => parseProductInput({ ...value, description: 'không được phép' }));
});

test('từ chối giá, số lượng và ảnh không hợp lệ', () => {
  assert.throws(() => parseProductInput({ name: 'A', price: -1, soluong: 1, image: 'https://example.com/a.jpg' }));
  assert.throws(() => parseProductInput({ name: 'A', price: 1, soluong: 1.5, image: 'https://example.com/a.jpg' }));
  assert.throws(() => parseProductInput({ name: 'A', price: 1, soluong: 1, image: 'javascript:alert(1)' }));
});
