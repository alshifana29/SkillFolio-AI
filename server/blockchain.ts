import crypto from "crypto";
import { storage } from "./storage";
import type { Certificate, BlockchainBlock } from "@shared/schema";

export interface BlockData {
  certificateId: string;
  userId: string;
  title: string;
  institution: string;
  issueDate: string;
  hash: string;
}

export class Blockchain {
  private difficulty: number = 2;

  constructor(difficulty: number = 2) {
    this.difficulty = difficulty;
  }

  calculateHash(index: number, timestamp: Date, data: any, previousHash: string, nonce: number): string {
    const blockString = `${index}${timestamp.toISOString()}${JSON.stringify(data)}${previousHash}${nonce}`;
    return crypto.createHash("sha256").update(blockString).digest("hex");
  }

  mineBlock(index: number, timestamp: Date, data: any, previousHash: string): { hash: string; nonce: number } {
    let nonce = 0;
    let hash = "";
    const target = "0".repeat(this.difficulty);

    while (!hash.startsWith(target)) {
      nonce++;
      hash = this.calculateHash(index, timestamp, data, previousHash, nonce);
    }

    return { hash, nonce };
  }

  async createGenesisBlock(): Promise<BlockchainBlock> {
    const existingGenesis = await storage.getLatestBlock();
    if (existingGenesis && existingGenesis.index === 0) {
      return existingGenesis;
    }

    const timestamp = new Date();
    const data = { message: "Genesis Block - AcademicFolioChain" };
    const previousHash = "0";
    const { hash, nonce } = this.mineBlock(0, timestamp, data, previousHash);

    return storage.addBlock({
      index: 0,
      timestamp,
      data,
      previousHash,
      hash,
      nonce,
      difficulty: this.difficulty,
      certificateId: null,
    });
  }

  async addCertificateToChain(certificate: Certificate): Promise<BlockchainBlock> {
    const latestBlock = await storage.getLatestBlock();
    
    if (!latestBlock) {
      await this.createGenesisBlock();
      return this.addCertificateToChain(certificate);
    }

    const newIndex = latestBlock.index + 1;
    const timestamp = new Date();
    const data: BlockData = {
      certificateId: certificate.id,
      userId: certificate.userId,
      title: certificate.title,
      institution: certificate.institution,
      issueDate: certificate.createdAt.toISOString(),
      hash: this.generateCertificateHash(certificate),
    };

    const { hash, nonce } = this.mineBlock(newIndex, timestamp, data, latestBlock.hash);

    return storage.addBlock({
      index: newIndex,
      timestamp,
      data,
      previousHash: latestBlock.hash,
      hash,
      nonce,
      difficulty: this.difficulty,
      certificateId: certificate.id,
    });
  }

  generateCertificateHash(certificate: Certificate): string {
    const certString = `${certificate.id}${certificate.userId}${certificate.title}${certificate.institution}${certificate.createdAt.toISOString()}`;
    return crypto.createHash("sha256").update(certString).digest("hex");
  }

  async validateChain(): Promise<{ isValid: boolean; errors: string[] }> {
    const blocks = await storage.getAllBlocks();
    const errors: string[] = [];

    if (blocks.length === 0) {
      return { isValid: true, errors: [] };
    }

    if (blocks[0].previousHash !== "0") {
      errors.push("Genesis block has invalid previous hash");
    }

    for (let i = 1; i < blocks.length; i++) {
      const currentBlock = blocks[i];
      const previousBlock = blocks[i - 1];

      if (currentBlock.previousHash !== previousBlock.hash) {
        errors.push(`Block ${i} has invalid previous hash reference`);
      }

      const calculatedHash = this.calculateHash(
        currentBlock.index,
        new Date(currentBlock.timestamp),
        currentBlock.data,
        currentBlock.previousHash,
        currentBlock.nonce
      );

      if (calculatedHash !== currentBlock.hash) {
        errors.push(`Block ${i} has invalid hash`);
      }

      if (!currentBlock.hash.startsWith("0".repeat(currentBlock.difficulty))) {
        errors.push(`Block ${i} does not meet difficulty requirement`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async verifyBlock(hash: string): Promise<{ verified: boolean; block: BlockchainBlock | null; certificate: Certificate | null }> {
    const block = await storage.getBlockByHash(hash);
    
    if (!block) {
      return { verified: false, block: null, certificate: null };
    }

    const calculatedHash = this.calculateHash(
      block.index,
      new Date(block.timestamp),
      block.data,
      block.previousHash,
      block.nonce
    );

    if (calculatedHash !== block.hash) {
      return { verified: false, block, certificate: null };
    }

    let certificate: Certificate | null = null;
    if (block.certificateId) {
      certificate = await storage.getCertificateById(block.certificateId);
    }

    return { verified: true, block, certificate };
  }

  async getChainStats(): Promise<{
    totalBlocks: number;
    isValid: boolean;
    latestHash: string | null;
    difficulty: number;
  }> {
    const totalBlocks = await storage.getBlockCount();
    const validation = await this.validateChain();
    const latestBlock = await storage.getLatestBlock();

    return {
      totalBlocks,
      isValid: validation.isValid,
      latestHash: latestBlock?.hash || null,
      difficulty: this.difficulty,
    };
  }
}

export const blockchain = new Blockchain();
