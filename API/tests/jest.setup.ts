/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Configures shared setup behavior for API tests.
 */

import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

if (!process.env.TEST_DATABASE_URL) {
	throw new Error('TEST_DATABASE_URL must be set in .env.test');
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
