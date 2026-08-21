const logger = require("./logger");
const { prisma } = require("./db");

class CorCrud {
  constructor(modelName) {
    this.modelName = modelName;
    this.model = prisma[modelName];
  }
  async create(data) {
    try {
      return await this.model.create({ data });
    } catch (error) {
      logger.error("CorCrud create error", { error: error.message });
      throw error;
    }
  }

  async findMany({ where = {}, ...options } = {}) {
    try {
      return await this.model.findMany({ where, ...options });
    } catch (error) {
      logger.error("CorCrud findMany error", { error: error.message });
      throw error;
    }
  }

  async findOne(where) {
    try {
      return await this.model.findUnique({ where });
    } catch (error) {
      logger.error("CorCrud findOne error", { error: error.message });
      throw error;
    }
  }

  async update(where, data) {
    try {
      return await this.model.update({ where, data });
    } catch (error) {
      logger.error("CorCrud update error", { error: error.message });
      throw error;
    }
  }

  async remove(where) {
    try {
      return await this.model.delete({ where });
    } catch (error) {
      logger.error("CorCrud remove error", { error: error.message });
      throw error;
    }
  }
}

module.exports = CorCrud;
