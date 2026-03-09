// Global type declarations for modules that may not have @types packages available
// This ensures TypeScript can compile even if @types packages are not found

declare module 'express' {
  import { IncomingMessage, ServerResponse } from 'http'
  
  export interface Request extends IncomingMessage {
    body: any
    params: any
    query: any
    headers: any
    [key: string]: any
  }
  
  export interface Response extends ServerResponse {
    json: (body: any) => Response
    status: (code: number) => Response
    send: (body?: any) => Response
    [key: string]: any
  }
  
  export interface NextFunction {
    (err?: any): void
  }
  
  export interface IRouter {
    use: (...handlers: any[]) => IRouter
    get: (path: string, ...handlers: any[]) => IRouter
    post: (path: string, ...handlers: any[]) => IRouter
    put: (path: string, ...handlers: any[]) => IRouter
    delete: (path: string, ...handlers: any[]) => IRouter
    patch: (path: string, ...handlers: any[]) => IRouter
    [key: string]: any
  }
  
  export function Router(): IRouter
  
  export interface Application {
    use: (...handlers: any[]) => Application
    get: (path: string, ...handlers: any[]) => Application
    post: (path: string, ...handlers: any[]) => Application
    put: (path: string, ...handlers: any[]) => Application
    delete: (path: string, ...handlers: any[]) => Application
    patch: (path: string, ...handlers: any[]) => Application
    listen: (port: number | string, callback?: () => void) => any
    [key: string]: any
  }
  
  interface Express {
    (): Application
    json: () => any
    urlencoded: (options?: any) => any
    Router: () => IRouter
  }
  
  const express: Express
  export default express
}

declare module 'cors' {
  import { Request, Response, NextFunction } from 'express'
  
  interface CorsOptions {
    origin?: string | string[] | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void)
    credentials?: boolean
    [key: string]: any
  }
  
  function cors(options?: CorsOptions): (req: Request, res: Response, next: NextFunction) => void
  export default cors
}

declare module 'jsonwebtoken' {
  export interface JwtPayload {
    [key: string]: any
  }
  
  export interface SignOptions {
    expiresIn?: string | number
    algorithm?: string
    [key: string]: any
  }
  
  export class JsonWebTokenError extends Error {
    name: string
    message: string
  }
  
  export function verify(token: string, secret: string): string | JwtPayload
  export function sign(payload: any, secret: string, options?: SignOptions): string
  export function decode(token: string, options?: any): string | JwtPayload | null
}

declare module 'bcryptjs' {
  export function hash(data: string, saltOrRounds: number | string): Promise<string>
  export function compare(data: string, encrypted: string): Promise<boolean>
  export function hashSync(data: string, saltOrRounds: number | string): string
  export function compareSync(data: string, encrypted: string): boolean
}

declare module 'lunar-calendar' {
  interface LunarInfo {
    lunarYear: number
    lunarMonth: number
    lunarDay: number
    isLeap: boolean
    [key: string]: any
  }
  function solarToLunar(year: number, month: number, day: number): LunarInfo
  export default { solarToLunar }
}

