import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateBrandDto {
  @ApiProperty({ example: 'Acme Coffee' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'Karachi, Pakistan' })
  @IsString()
  @MinLength(1)
  location: string;

  @ApiProperty({ example: 'Food & Beverage' })
  @IsString()
  @MinLength(1)
  category: string;

  @ApiProperty({ type: 'string', format: 'binary', description: 'Logo image' })
  logo?: unknown;
}
