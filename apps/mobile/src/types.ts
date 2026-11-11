export type Product = {
  _id: string;
  name: string;
  price: number;
  soluong: number;
  image: string;
};

export type ProductDraft = Omit<Product, '_id'>;
