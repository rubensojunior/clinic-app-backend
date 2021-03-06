import {
  ConnectionNotFoundError,
  TransactionNotFoundError,
} from '@/infra/common/repositories/typeorm'
import { DbTransaction } from '@/application/common/contracts'

import {
  createConnection,
  getConnection,
  getConnectionManager,
  ObjectType,
  QueryRunner,
  Repository,
  Connection,
  getRepository,
} from 'typeorm'

export class TypeormConnection implements DbTransaction {
  private static instance?: TypeormConnection
  private query?: QueryRunner
  private connection?: Connection

  private constructor() {}

  static getInstance(): TypeormConnection {
    if (TypeormConnection.instance === undefined)
      TypeormConnection.instance = new TypeormConnection()
    return TypeormConnection.instance
  }

  async connect(): Promise<void> {
    this.connection = getConnectionManager().has('default')
      ? getConnection()
      : await createConnection()
  }

  async disconnect(): Promise<void> {
    if (this.connection === undefined) throw new ConnectionNotFoundError()
    await getConnection().close()
    this.query = undefined
    this.connection = undefined
  }

  async openTransaction(): Promise<void> {
    if (this.connection === undefined) throw new ConnectionNotFoundError()
    this.query = this.connection.createQueryRunner()
    await this.query.startTransaction()
  }

  async closeTransaction(): Promise<void> {
    if (this.query === undefined) throw new TransactionNotFoundError()
    await this.query.release()
  }

  async commit(): Promise<void> {
    if (this.query === undefined) throw new TransactionNotFoundError()
    await this.query.commitTransaction()
  }

  async rollback(): Promise<void> {
    if (this.query === undefined) throw new TransactionNotFoundError()
    await this.query.rollbackTransaction()
  }

  getRepository<Entity>(entity: ObjectType<Entity>): Repository<Entity> {
    if (this.connection === undefined) throw new ConnectionNotFoundError()
    if (this.query !== undefined)
      return this.query.manager.getRepository(entity)
    return getRepository(entity)
  }
}
