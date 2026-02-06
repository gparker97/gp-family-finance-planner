import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTransactionsStore } from './transactionsStore';
import { useAccountsStore } from './accountsStore';
import type { Transaction, Account } from '@/types/models';

// Mock the transaction repository
vi.mock('@/services/indexeddb/repositories/transactionRepository', () => ({
  getAllTransactions: vi.fn(),
  getTransactionById: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
}));

// Mock the account repository
vi.mock('@/services/indexeddb/repositories/accountRepository', () => ({
  getAllAccounts: vi.fn(),
  getAccountById: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  deleteAccount: vi.fn(),
  updateAccountBalance: vi.fn(),
}));

import * as transactionRepo from '@/services/indexeddb/repositories/transactionRepository';
import * as accountRepo from '@/services/indexeddb/repositories/accountRepository';

const mockAccount: Account = {
  id: 'test-account-1',
  memberId: 'member-1',
  name: 'Test Checking',
  type: 'checking',
  currency: 'USD',
  balance: 1000,
  institution: 'Test Bank',
  isActive: true,
  includeInNetWorth: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const mockDestAccount: Account = {
  id: 'test-account-2',
  memberId: 'member-1',
  name: 'Test Savings',
  type: 'savings',
  currency: 'USD',
  balance: 5000,
  institution: 'Test Bank',
  isActive: true,
  includeInNetWorth: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const mockTransaction: Transaction = {
  id: 'test-transaction-1',
  accountId: 'test-account-1',
  type: 'expense',
  amount: 100,
  currency: 'USD',
  category: 'groceries',
  date: '2024-01-15T00:00:00.000Z',
  description: 'Grocery shopping',
  isReconciled: false,
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
};

describe('transactionsStore - Account Balance Sync', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('createTransaction - balance updates', () => {
    it('should decrease account balance when creating an expense', async () => {
      const transactionsStore = useTransactionsStore();
      const accountsStore = useAccountsStore();

      // Setup: add account to the accounts store
      accountsStore.accounts.push({ ...mockAccount });

      // Mock repository responses
      const newTransaction = { ...mockTransaction, id: 'new-tx-1' };
      vi.mocked(transactionRepo.createTransaction).mockResolvedValue(newTransaction);
      vi.mocked(accountRepo.updateAccount).mockResolvedValue({
        ...mockAccount,
        balance: 900,
      });

      // Act: create an expense transaction
      const result = await transactionsStore.createTransaction({
        accountId: 'test-account-1',
        type: 'expense',
        amount: 100,
        currency: 'USD',
        category: 'groceries',
        date: '2024-01-15T00:00:00.000Z',
        description: 'Grocery shopping',
        isReconciled: false,
      });

      // Assert
      expect(result).not.toBeNull();
      expect(accountRepo.updateAccount).toHaveBeenCalledWith('test-account-1', { balance: 900 });
    });

    it('should increase account balance when creating an income', async () => {
      const transactionsStore = useTransactionsStore();
      const accountsStore = useAccountsStore();

      // Setup
      accountsStore.accounts.push({ ...mockAccount });

      const incomeTransaction = {
        ...mockTransaction,
        id: 'income-tx-1',
        type: 'income' as const,
        amount: 500,
        category: 'salary',
      };
      vi.mocked(transactionRepo.createTransaction).mockResolvedValue(incomeTransaction);
      vi.mocked(accountRepo.updateAccount).mockResolvedValue({
        ...mockAccount,
        balance: 1500,
      });

      // Act
      const result = await transactionsStore.createTransaction({
        accountId: 'test-account-1',
        type: 'income',
        amount: 500,
        currency: 'USD',
        category: 'salary',
        date: '2024-01-15T00:00:00.000Z',
        description: 'Monthly salary',
        isReconciled: false,
      });

      // Assert
      expect(result).not.toBeNull();
      expect(accountRepo.updateAccount).toHaveBeenCalledWith('test-account-1', { balance: 1500 });
    });

    it('should update both accounts when creating a transfer', async () => {
      const transactionsStore = useTransactionsStore();
      const accountsStore = useAccountsStore();

      // Setup: add both accounts
      accountsStore.accounts.push({ ...mockAccount });
      accountsStore.accounts.push({ ...mockDestAccount });

      const transferTransaction = {
        ...mockTransaction,
        id: 'transfer-tx-1',
        type: 'transfer' as const,
        toAccountId: 'test-account-2',
        amount: 200,
      };
      vi.mocked(transactionRepo.createTransaction).mockResolvedValue(transferTransaction);
      vi.mocked(accountRepo.updateAccount)
        .mockResolvedValueOnce({ ...mockAccount, balance: 800 })
        .mockResolvedValueOnce({ ...mockDestAccount, balance: 5200 });

      // Act
      const result = await transactionsStore.createTransaction({
        accountId: 'test-account-1',
        toAccountId: 'test-account-2',
        type: 'transfer',
        amount: 200,
        currency: 'USD',
        category: 'transfer',
        date: '2024-01-15T00:00:00.000Z',
        description: 'Transfer to savings',
        isReconciled: false,
      });

      // Assert
      expect(result).not.toBeNull();
      expect(accountRepo.updateAccount).toHaveBeenCalledTimes(2);
      expect(accountRepo.updateAccount).toHaveBeenCalledWith('test-account-1', { balance: 800 });
      expect(accountRepo.updateAccount).toHaveBeenCalledWith('test-account-2', { balance: 5200 });
    });
  });

  describe('deleteTransaction - balance reversal', () => {
    it('should restore account balance when deleting an expense', async () => {
      const transactionsStore = useTransactionsStore();
      const accountsStore = useAccountsStore();

      // Setup
      const accountWithBalance900 = { ...mockAccount, balance: 900 };
      accountsStore.accounts.push(accountWithBalance900);
      transactionsStore.transactions.push({ ...mockTransaction });

      vi.mocked(transactionRepo.deleteTransaction).mockResolvedValue(true);
      vi.mocked(accountRepo.updateAccount).mockResolvedValue({
        ...mockAccount,
        balance: 1000,
      });

      // Act
      const result = await transactionsStore.deleteTransaction('test-transaction-1');

      // Assert
      expect(result).toBe(true);
      expect(accountRepo.updateAccount).toHaveBeenCalledWith('test-account-1', { balance: 1000 });
    });

    it('should restore account balance when deleting an income', async () => {
      const transactionsStore = useTransactionsStore();
      const accountsStore = useAccountsStore();

      // Setup
      const incomeTransaction = {
        ...mockTransaction,
        id: 'income-tx-1',
        type: 'income' as const,
        amount: 500,
      };
      const accountWithBalance1500 = { ...mockAccount, balance: 1500 };
      accountsStore.accounts.push(accountWithBalance1500);
      transactionsStore.transactions.push(incomeTransaction);

      vi.mocked(transactionRepo.deleteTransaction).mockResolvedValue(true);
      vi.mocked(accountRepo.updateAccount).mockResolvedValue({
        ...mockAccount,
        balance: 1000,
      });

      // Act
      const result = await transactionsStore.deleteTransaction('income-tx-1');

      // Assert
      expect(result).toBe(true);
      expect(accountRepo.updateAccount).toHaveBeenCalledWith('test-account-1', { balance: 1000 });
    });

    it('should restore both account balances when deleting a transfer', async () => {
      const transactionsStore = useTransactionsStore();
      const accountsStore = useAccountsStore();

      // Setup
      const transferTransaction = {
        ...mockTransaction,
        id: 'transfer-tx-1',
        type: 'transfer' as const,
        toAccountId: 'test-account-2',
        amount: 200,
      };
      accountsStore.accounts.push({ ...mockAccount, balance: 800 });
      accountsStore.accounts.push({ ...mockDestAccount, balance: 5200 });
      transactionsStore.transactions.push(transferTransaction);

      vi.mocked(transactionRepo.deleteTransaction).mockResolvedValue(true);
      vi.mocked(accountRepo.updateAccount)
        .mockResolvedValueOnce({ ...mockAccount, balance: 1000 })
        .mockResolvedValueOnce({ ...mockDestAccount, balance: 5000 });

      // Act
      const result = await transactionsStore.deleteTransaction('transfer-tx-1');

      // Assert
      expect(result).toBe(true);
      expect(accountRepo.updateAccount).toHaveBeenCalledTimes(2);
      expect(accountRepo.updateAccount).toHaveBeenCalledWith('test-account-1', { balance: 1000 });
      expect(accountRepo.updateAccount).toHaveBeenCalledWith('test-account-2', { balance: 5000 });
    });
  });

  describe('updateTransaction - balance adjustments', () => {
    it('should adjust balance when transaction amount changes', async () => {
      const transactionsStore = useTransactionsStore();
      const accountsStore = useAccountsStore();

      // Setup: expense of 100, account balance at 900
      const accountWithBalance900 = { ...mockAccount, balance: 900 };
      accountsStore.accounts.push(accountWithBalance900);
      transactionsStore.transactions.push({ ...mockTransaction });

      // Updating to 150 should change balance to 850
      const updatedTransaction = { ...mockTransaction, amount: 150 };
      vi.mocked(transactionRepo.updateTransaction).mockResolvedValue(updatedTransaction);
      vi.mocked(accountRepo.updateAccount)
        .mockResolvedValueOnce({ ...mockAccount, balance: 1000 }) // Reverse old
        .mockResolvedValueOnce({ ...mockAccount, balance: 850 }); // Apply new

      // Act
      const result = await transactionsStore.updateTransaction('test-transaction-1', { amount: 150 });

      // Assert
      expect(result).not.toBeNull();
      expect(accountRepo.updateAccount).toHaveBeenCalledTimes(2);
    });

    it('should adjust balance when transaction type changes from expense to income', async () => {
      const transactionsStore = useTransactionsStore();
      const accountsStore = useAccountsStore();

      // Setup: expense of 100, account balance at 900
      const accountWithBalance900 = { ...mockAccount, balance: 900 };
      accountsStore.accounts.push(accountWithBalance900);
      transactionsStore.transactions.push({ ...mockTransaction });

      // Changing to income should change balance to 1100 (reverse -100, apply +100)
      const updatedTransaction = { ...mockTransaction, type: 'income' as const };
      vi.mocked(transactionRepo.updateTransaction).mockResolvedValue(updatedTransaction);
      vi.mocked(accountRepo.updateAccount)
        .mockResolvedValueOnce({ ...mockAccount, balance: 1000 }) // Reverse old expense
        .mockResolvedValueOnce({ ...mockAccount, balance: 1100 }); // Apply new income

      // Act
      const result = await transactionsStore.updateTransaction('test-transaction-1', { type: 'income' });

      // Assert
      expect(result).not.toBeNull();
      expect(accountRepo.updateAccount).toHaveBeenCalledTimes(2);
    });
  });
});
