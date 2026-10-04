import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';

import { AuthenticatedUser } from '../auth/authenticated-user.decorator';
import { Public } from '../auth/public.decorator';
import { PublicUser } from '../shared/utils/public-user.utils';
import { AddCompletedOrderPhotoDto } from './dto/add-completed-order-photo.dto';
import { FindProfessionalsQueryDto } from './dto/find-professionals-query.dto';
import { ReplaceProfessionalServicesDto } from './dto/replace-professional-services.dto';
import { UpdateProfessionalProfileDto } from './dto/update-professional-profile.dto';
import { UpdateProfessionalPresentationDto } from './dto/update-professional-presentation.dto';
import { ProfessionalsService } from './professionals.service';

@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Public()
  @Get()
  findPublic(@Query() query: FindProfessionalsQueryDto) {
    return this.professionalsService.findPublic(query);
  }

  @Get('me')
  findOwn(@AuthenticatedUser() authenticatedUser: PublicUser) {
    return this.professionalsService.findOwn(authenticatedUser.id);
  }

  @Put('me')
  updateOwn(
    @AuthenticatedUser() authenticatedUser: PublicUser,
    @Body() updateProfessionalProfileDto: UpdateProfessionalProfileDto
  ) {
    return this.professionalsService.updateOwn(authenticatedUser.id, updateProfessionalProfileDto);
  }

  @Patch('me/presentation')
  updateOwnPresentation(
    @AuthenticatedUser() authenticatedUser: PublicUser,
    @Body() presentation: UpdateProfessionalPresentationDto
  ) {
    return this.professionalsService.updateOwnPresentation(authenticatedUser.id, presentation);
  }

  @Post('me/orders/:orderId/photos')
  addCompletedOrderPhoto(
    @AuthenticatedUser() authenticatedUser: PublicUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() photo: AddCompletedOrderPhotoDto
  ) {
    return this.professionalsService.addCompletedOrderPhoto(authenticatedUser.id, orderId, photo);
  }

  @Put('me/services')
  replaceOwnServices(
    @AuthenticatedUser() authenticatedUser: PublicUser,
    @Body() replaceProfessionalServicesDto: ReplaceProfessionalServicesDto
  ) {
    return this.professionalsService.replaceOwnServices(authenticatedUser.id, replaceProfessionalServicesDto);
  }

  @Public()
  @Get(':professionalId')
  findPublicById(@Param('professionalId', ParseUUIDPipe) professionalId: string) {
    return this.professionalsService.findPublicById(professionalId);
  }
}
