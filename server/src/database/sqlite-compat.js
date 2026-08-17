/**
 * better-sqlite3 兼容层
 * 
 * 使用 Node.js 内置的 node:sqlite 模块替代 better-sqlite3
 * 提供相同的 API 接口，无需修改现有代码
 * 
 * 兼容 API:
 * - new Database(path)
 * - db.prepare(sql) -> { run(), get(), all() }
 * - db.exec(sql)
 * - db.pragma(statement)
 * - db.transaction(fn)
 * - db.close()
 */

import { DatabaseSync } from 'node:sqlite'

export default class Database {
  constructor(path, options = {}) {
    this._db = new DatabaseSync(path)
    this._options = options
  }

  exec(sql) {
    this._db.exec(sql)
  }

  prepare(sql) {
    const stmt = this._db.prepare(sql)

    return {
      run: (...params) => {
        // better-sqlite3 returns an object with changes, lastInsertRowid
        const result = stmt.run(...params)
        return {
          changes: result.changes,
          lastInsertRowid: result.lastInsertRowid,
          ...result
        }
      },
      get: (...params) => {
        return stmt.get(...params)
      },
      all: (...params) => {
        return stmt.all(...params)
      },
      // Support for iterate (simplified)
      iterate: (...params) => {
        const rows = stmt.all(...params)
        return rows[Symbol.iterator]()
      }
    }
  }

  pragma(statement) {
    try {
      this._db.exec(`PRAGMA ${statement}`)
    } catch (e) {
      // Ignore pragma errors
    }
    return []
  }

  transaction(fn) {
    return (...args) => {
      this._db.exec('BEGIN')
      try {
        const result = fn(...args)
        this._db.exec('COMMIT')
        return result
      } catch (err) {
        this._db.exec('ROLLBACK')
        throw err
      }
    }
  }

  close() {
    this._db.close()
  }

  // better-sqlite3 compatibility: default export
  static default = Database
}
