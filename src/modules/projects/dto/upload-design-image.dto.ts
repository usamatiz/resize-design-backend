import { ApiProperty } from '@nestjs/swagger';

export class UploadDesignImageDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'PNG or JPEG rendered from the resized JSON by the Polotno SDK',
  })
  image?: unknown;
}
