import 'dotenv/config';
import { DataSource } from 'typeorm';
import { PostgresDataSourceOptions } from 'typeorm/driver/postgres/PostgresDataSourceOptions';

export const dataSourceOptions: PostgresDataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [__dirname + '/../modules/**/entities/*.entity.{ts,js}'],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
};

export default new DataSource(dataSourceOptions);
