import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { AdminGuard } from '../auth/admin.guard';
import { AuthenticatedUser } from '../auth/authenticated-user.decorator';
import { ReviewModerationDto } from '../moderation/dto/review-moderation.dto';
import { PublicUser } from '../shared/utils/public-user.utils';
import { CreateHighlightDto } from './dto/create-highlight.dto';
import { FindHighlightsQueryDto } from './dto/find-highlights-query.dto';
import { HighlightsService } from './highlights.service';

@Controller('highlights')
export class HighlightsController {
  constructor(private readonly highlightsService: HighlightsService) {}
  @Get()
  findFeed(@AuthenticatedUser() user: PublicUser, @Query() query: FindHighlightsQueryDto) { return this.highlightsService.findFeed(user.id, query); }
  @Get('me')
  findOwn(@AuthenticatedUser() user: PublicUser) { return this.highlightsService.findOwn(user.id); }
  @Post()
  create(@AuthenticatedUser() user: PublicUser, @Body() publication: CreateHighlightDto) { return this.highlightsService.create(user.id, publication); }
  @UseGuards(AdminGuard)
  @Get('moderation')
  findModeration() { return this.highlightsService.findModeration(); }
  @UseGuards(AdminGuard)
  @Patch(':highlightId/review')
  review(@Param('highlightId', ParseUUIDPipe) highlightId: string, @AuthenticatedUser() user: PublicUser, @Body() review: ReviewModerationDto) { return this.highlightsService.review(highlightId, user.id, review); }
  @Delete(':highlightId')
  archive(@Param('highlightId', ParseUUIDPipe) highlightId: string, @AuthenticatedUser() user: PublicUser) { return this.highlightsService.archive(highlightId, user.id); }
}
