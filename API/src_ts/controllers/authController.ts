import { NextFunction, Request, Response } from 'express';
import prisma from '../prisma';
import config from '../config';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  generateRefreshToken,
  storeSession,
  storeRefreshToken,
  refreshTokenExpiryDate,
} from '../utils/auth';
import { createHttpError } from '../utils/httpError';

function accessExpiryFromNow() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 15);
  return d;
}

function normalizeRole(role: string | undefined) {
  const normalized = (role || 'EMPLOYEE').toUpperCase();
  if (normalized === 'CLERK' || normalized === 'MANAGER' || normalized === 'EMPLOYEE') {
    return normalized;
  }
  return 'EMPLOYEE';
}

export async function signupManager(req: Request, res: Response, next: NextFunction) {
  try {
    const managerExists = await prisma.user.count({ where: { role: 'MANAGER' } });
    if (managerExists > 0) {
      return next(createHttpError('A manager account already exists', 403));
    }

    req.body.role = 'MANAGER';
    return signup(req, res, next);
  } catch (err) {
    return next(err);
  }
}

export async function signup(req: Request, res: Response, next: NextFunction) {
  try {

    //handle request body data
    const { name, email, password, role, department, contactNumber } = req.body;
    if (!email || !password || !name) {
      return next(createHttpError('Missing fields', 400));
    }

    //check if user already exists and handle accordingly
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return next(createHttpError('Email already in use', 400));
    }

    //if user does not exist , hash password provided by the user and create persistant record
    const passwordHash = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: normalizeRole(role),
        department,
        contactNumber,
      },
    });

    //create seeded request payload 
    const payload = { sub: user.id, email: user.email, role: user.role };
    
    //sign token with payload
    const { token: accessToken, jti } = signAccessToken(payload);

    //calculate accessToken expiry time 
    const accessExpires = accessExpiryFromNow();

    //persist session record to database
    await storeSession(user.id, jti, accessExpires);

    //create a refreshToken , calculate expiry time and persist token data to database
    const { token: refreshToken, token_hash } = generateRefreshToken();
    const refreshExpires = refreshTokenExpiryDate();
    await storeRefreshToken(user.id, token_hash, refreshExpires);

    return res.json({ accessToken, refreshToken });
  } catch (err) {
    return next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {

    //get request body fields
    const { email, password } = req.body;

    //if values are'nt filled and dont exist
    if (!email || !password) {
      return next(createHttpError('Missing fields', 400));
    }

    //look up user from persistant storage
    const user = await prisma.user.findUnique({ where: { email } });

    //if user record does not exist
    if (!user) {
      return next(createHttpError('Invalid credentials', 400));
    }

    //verify is passwords match
    const verified = verifyPassword(password, user.passwordHash);

    //handle case where passwords dont match
    if (!verified) {
      return next(createHttpError('Invalid credentials', 400));
    }

    //if match
    //create access and sign access access token , assign token an id (jti)
    const payload = { sub: user.id, email: user.email, role: user.role };
    const { token: accessToken, jti } = signAccessToken(payload);
    const accessExpires = accessExpiryFromNow();

    //persist session details to the database
    try{
      await storeSession(user.id, jti, accessExpires);
    }catch(err){
      return createHttpError("Database error while persisting access token");
    }
    

    //create , assign refresh token expiry date and persist token details
    const { token: refreshToken, token_hash } = generateRefreshToken();
    const refreshExpires = refreshTokenExpiryDate();

    try{
      await storeRefreshToken(user.id, token_hash, refreshExpires);
    }catch(err){
      return next(createHttpError("Database error while persisting refresh token"))
    }
    
    //send response containing access and refresh token
    return res.json({ message: "Login successful", accessToken, refreshToken });
  } catch (err) {
    return next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {

    //retrieve token from request body
    const { refreshToken } = req.body;

    //if body does not contain a refreshToken field throw an error and end reqeust lifecyle
    if (!refreshToken) {
      return next(createHttpError('Missing refreshToken', 400));
    }

    //Hash refresh token 
    const token_hash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    //lookup refresh token in list of similar persisted tokens
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: token_hash } });

    //if matching record does not exist or record has been revoked , send a matching response
    if (!stored || stored.revoked) {
      return next(createHttpError('Invalid refresh token', 401));
    }

    //if matching token exists but has expired , send a matching response
    if (stored.expiresAt <= new Date()) {
      return next(createHttpError('Refresh token expired', 401));
    }

    //update refreshToken instance and set it's revoked field to true
    try{
      await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
    }catch(err){
      return next(createHttpError("Database error while persisting refresh token data",500))
    }


    //verify user existance
    //might be cause of a later problem :{
    var user;
    try{
      user = await prisma.user.findUnique({ where: { id: stored.userId } });
    }catch(err){
      return next(createHttpError(""))
    }

    // handle case where user cannot be found
    if(!user) {
      return next(createHttpError('User not found', 400));
    }

    //create seeded payload and sign accessToken 
    const payload = { sub: user.id, email: user.email, role: user.role };

    //create an access token ,an associated jwt id , and access token expiry time
    const { token: accessToken, jti } = signAccessToken(payload);
    const accessExpires = accessExpiryFromNow();

    //persist session data
    await storeSession(user.id, jti, accessExpires);

    //issue a new refresh token
    const { token: newRefreshToken, token_hash: newRefreshTokenHash } = generateRefreshToken();

    //calculate when refresh token expires ,
    const refreshExpires = refreshTokenExpiryDate();

    //persist new refresh token data
    await storeRefreshToken(user.id, newRefreshTokenHash, refreshExpires);

    return res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    return next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {

    //retrieve authentication header
    const authHeader = req.headers['authorization'];

    //if authentication header is not present , throw error
    if (!authHeader) {
      return next(createHttpError('Missing Authorization header', 400));
    }

    //validate if authentication header elements are present
    const parts = (authHeader as string).split(' ');
    if (parts.length !== 2) {
      return next(createHttpError('Invalid Authorization header', 400));
    }

    //retrieve access token 
    const token = parts[1];

    //decode and handle jwt authentication
    const decoded = jwt.verify(`token`, config.JWT_SECRET) as any;
    const jti = decoded.jti || decoded?.jwtid || null;
    //check if jwt id is present in decoded payload
    if (!jti) {
      return next(createHttpError('Token missing jti', 400));
    }

    //revoke jwt id 
    try{
       await prisma.session.updateMany({ where: { jwtId: jti }, data: { revoked: true } });
    }catch(err){
      return next(createHttpError("Database error while revoking token",500))
    }

    //retrive refresh token , (must be provided)
    const { refreshToken } = req.body;
    if (refreshToken) {
      //hash token and compare to token in database , if it matches , revoke the refresh toke
      const token_hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      try {
        //
        const token = await prisma.refreshToken.findUnique({ where: { tokenHash: token_hash } });
        if (!token) {
          return next(createHttpError("Refresh Token Cannot Be Validated", 400));
        }
        await prisma.refreshToken.update({ where: { tokenHash: token_hash }, data: { revoked: true } });
      } catch (err) {
        return next(createHttpError("Database error while revoking token", 500));
      }
    }
    return res.json({ message: 'Logged out' });
  } catch (err) {
    return next(err);
  }
}
