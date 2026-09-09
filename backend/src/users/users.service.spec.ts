import { User } from './user.entity';
import { UsersService } from './users.service';
import { ServiceUnavailableException } from '@nestjs/common';

describe('UsersService', () => {
  it('removes owned files and anonymizes the account in one deletion flow', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);
    const queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute
    };
    const manager = {
      delete: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder)
    };
    const dataSource = {
      transaction: jest
        .fn()
        .mockImplementation((operation: (entityManager: typeof manager) => Promise<void>) =>
          operation(manager)
        )
    };
    const storageService = { deleteOwnedObjects: jest.fn().mockResolvedValue(undefined) };
    const service = new UsersService(dataSource as never, storageService as never, {} as never);
    const userId = '7af8f031-dad8-456a-9c32-5709aa760caf';

    await service.deleteOwnAccount(userId);

    expect(storageService.deleteOwnedObjects).toHaveBeenCalledWith(userId);
    expect(manager.update).toHaveBeenCalledWith(
      User,
      { id: userId },
      expect.objectContaining({ isActive: false, googleSubject: null })
    );
    expect(execute).toHaveBeenCalled();
  });

  it('keeps the account active when owned files cannot be removed', async () => {
    const dataSource = { transaction: jest.fn() };
    const storageService = { deleteOwnedObjects: jest.fn().mockRejectedValue(new Error('storage')) };
    const service = new UsersService(dataSource as never, storageService as never, {} as never);

    await expect(service.deleteOwnAccount('user-id')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});
