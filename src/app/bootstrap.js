import express from 'express';
import cors from 'cors';
import loginRoutes from '../routes/auth/login.js';
import signupRoutes from '../routes/auth/signup.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', loginRoutes);
app.use('/api/auth', signupRoutes);

export default app;