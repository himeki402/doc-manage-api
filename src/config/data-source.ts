import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5431,
  username: 'postgres',
  password: '123456',
  database: 'postgres',
  entities: ['dist/modules/**/*.entity.js'],
  migrations: ['dist/migrations/*.js'],
  migrationsTableName: 'migrations',
  synchronize: false,
  migrationsRun: true,
  logging: true,
});
