declare module 'bcryptjs' {
  export type CompareCallback = (err: Error | undefined, same: boolean) => void
  export type HashCallback = (err: Error | undefined, encrypted: string) => void
  export type GenSaltCallback = (err: Error | undefined, salt: string) => void

  export function genSaltSync(rounds?: number): string
  export function genSalt(rounds: number, callback: GenSaltCallback): void
  export function genSalt(callback: GenSaltCallback): void

  export function hashSync(data: string, salt: string | number): string
  export function hash(data: string, salt: string | number, callback: HashCallback): void
  export function hash(data: string, salt: string | number): Promise<string>

  export function compareSync(data: string, encrypted: string): boolean
  export function compare(data: string, encrypted: string, callback: CompareCallback): void
  export function compare(data: string, encrypted: string): Promise<boolean>

  const bcrypt: {
    genSaltSync: typeof genSaltSync
    genSalt: typeof genSalt
    hashSync: typeof hashSync
    hash: typeof hash
    compareSync: typeof compareSync
    compare: typeof compare
  }

  export default bcrypt
}

