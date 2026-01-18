import { Sequelize } from 'sequelize';
import path from 'path';

const storagePath = path.join(__dirname, '../../database.sqlite');

export const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: storagePath,
    logging: false,
});

export const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};
