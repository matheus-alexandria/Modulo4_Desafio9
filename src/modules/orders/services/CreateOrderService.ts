import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import { throws } from 'assert';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    // TODO
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError("This customer does't exist");
    }

    const findedProducts = await this.productsRepository.findAllById(
      products.map(product => {
        return { id: product.id };
      }),
    );

    if (findedProducts.length !== products.length) {
      throw new AppError(
        'The product you want to order is invalid or inexistent',
      );
    }

    const quantifiedProducts = findedProducts.map(findedProduct => {
      const productQuantity = products.filter(product => {
        return product.id === findedProduct.id;
      })[0].quantity;

      if (findedProduct.quantity < productQuantity) {
        throw new AppError(
          `The product ${findedProduct.name} is not available`,
        );
      }

      return {
        product_id: findedProduct.id,
        price: findedProduct.price,
        quantity: productQuantity,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: quantifiedProducts,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateOrderService;
