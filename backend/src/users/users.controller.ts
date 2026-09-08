import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Put
} from '@nestjs/common';

import { AuthenticatedUser } from '../auth/authenticated-user.decorator';
import { PublicUser } from '../shared/utils/public-user.utils';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getCurrentUser(@AuthenticatedUser() authenticatedUser: PublicUser) {
    const profile = await this.usersService.findOwnProfile(authenticatedUser.id);
    if (!profile) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return profile;
  }

  @Put('me')
  updateCurrentUser(
    @AuthenticatedUser() authenticatedUser: PublicUser,
    @Body() updateUserProfileDto: UpdateUserProfileDto
  ) {
    return this.usersService.updateOwnProfile(authenticatedUser.id, updateUserProfileDto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCurrentUser(@AuthenticatedUser() authenticatedUser: PublicUser) {
    await this.usersService.deleteOwnAccount(authenticatedUser.id);
  }

  @Get(':userId/public')
  async getPublicIdentity(@Param('userId', ParseUUIDPipe) userId: string) {
    const user = await this.usersService.findPublicIdentity(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    return user;
  }
}
