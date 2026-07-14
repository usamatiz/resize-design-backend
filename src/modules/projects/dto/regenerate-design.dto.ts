import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RegenerateDesignDto {
  @ApiProperty({
    example: 'Move the CTA to the top and make it larger.',
    description: 'New instructions for Claude to reflow the design.',
  })
  @IsString()
  @MinLength(1)
  prompt: string;
}
