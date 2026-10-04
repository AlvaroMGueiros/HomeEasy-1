import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';

import { AuthenticatedUser } from '../auth/authenticated-user.decorator';
import { PublicUser } from '../shared/utils/public-user.utils';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { MarketplaceService } from './marketplace.service';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Post('requests')
  createRequest(
    @AuthenticatedUser() authenticatedUser: PublicUser,
    @Body() createServiceRequestDto: CreateServiceRequestDto
  ) {
    return this.marketplaceService.createRequest(authenticatedUser.id, createServiceRequestDto);
  }

  @Get('requests/me')
  findOwnRequests(@AuthenticatedUser() authenticatedUser: PublicUser) {
    return this.marketplaceService.findOwnRequests(authenticatedUser.id);
  }

  @Get('requests/:requestId')
  findRequestById(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @AuthenticatedUser() authenticatedUser: PublicUser
  ) {
    return this.marketplaceService.findRequestById(requestId, authenticatedUser.id);
  }

  @Post('requests/:requestId/attachments/:mediaId')
  attachRequestMedia(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
    @AuthenticatedUser() authenticatedUser: PublicUser
  ) {
    return this.marketplaceService.attachRequestMedia(requestId, mediaId, authenticatedUser.id);
  }

  @Get('opportunities')
  findOpportunities(@AuthenticatedUser() authenticatedUser: PublicUser) {
    return this.marketplaceService.findOpportunities(authenticatedUser.id);
  }

  @Post('requests/:requestId/proposals')
  submitProposal(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @AuthenticatedUser() authenticatedUser: PublicUser,
    @Body() createProposalDto: CreateProposalDto
  ) {
    return this.marketplaceService.submitProposal(requestId, authenticatedUser.id, createProposalDto);
  }

  @Get('requests/:requestId/proposals')
  findRequestProposals(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @AuthenticatedUser() authenticatedUser: PublicUser
  ) {
    return this.marketplaceService.findRequestProposals(requestId, authenticatedUser.id);
  }

  @Get('proposals/me')
  findOwnProposals(@AuthenticatedUser() authenticatedUser: PublicUser) {
    return this.marketplaceService.findOwnProposals(authenticatedUser.id);
  }

  @Post('requests/:requestId/proposals/:proposalId/accept')
  acceptProposal(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Param('proposalId', ParseUUIDPipe) proposalId: string,
    @AuthenticatedUser() authenticatedUser: PublicUser
  ) {
    return this.marketplaceService.acceptProposal(requestId, proposalId, authenticatedUser.id);
  }

  @Post('requests/:requestId/cancel')
  cancelRequest(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @AuthenticatedUser() authenticatedUser: PublicUser,
    @Body() cancelOrderDto: CancelOrderDto
  ) {
    return this.marketplaceService.cancelRequest(requestId, authenticatedUser.id, cancelOrderDto);
  }

  @Get('orders/me')
  findOwnOrders(@AuthenticatedUser() authenticatedUser: PublicUser) {
    return this.marketplaceService.findOwnOrders(authenticatedUser.id);
  }

  @Get('orders/:orderId')
  findOwnOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @AuthenticatedUser() authenticatedUser: PublicUser
  ) {
    return this.marketplaceService.findOwnOrder(orderId, authenticatedUser.id);
  }

  @Post('orders/:orderId/rehire')
  rehire(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @AuthenticatedUser() authenticatedUser: PublicUser
  ) {
    return this.marketplaceService.rehire(orderId, authenticatedUser.id);
  }

  @Patch('orders/:orderId/status')
  updateOrderStatus(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @AuthenticatedUser() authenticatedUser: PublicUser,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto
  ) {
    return this.marketplaceService.updateOrderStatus(
      orderId,
      authenticatedUser.id,
      updateOrderStatusDto.status
    );
  }

  @Post('orders/:orderId/cancel')
  cancelOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @AuthenticatedUser() authenticatedUser: PublicUser,
    @Body() cancelOrderDto: CancelOrderDto
  ) {
    return this.marketplaceService.cancelOrder(orderId, authenticatedUser.id, cancelOrderDto);
  }
}
