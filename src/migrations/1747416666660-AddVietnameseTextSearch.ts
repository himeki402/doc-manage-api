import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVietnameseTextSearch1747416666660
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- Tạo hàm vn_unaccent
      CREATE OR REPLACE FUNCTION vn_unaccent(text)
      RETURNS text AS
      $func$
      SELECT lower(translate($1,
        '¹²³ÀÁẢẠÂẤẦẨẬẪÃÄÅÆàáảạâấầẩẫậãäåæĀāĂẮẰẲẴẶăắằẳẵặĄąÇçĆćĈĉĊċČčĎďĐđÈÉẸÊẾỀỄỆËèéẹêềếễệëĒēĔĕĖėĘęĚěĜĝĞğĠġĢģĤĥĦħĨÌÍỈỊÎÏìíỉịîïĩĪīĬĭĮįİıĲĳĴĵĶķĸĹĺĻļĽľĿŀŁłÑñŃńŅņŇňŉŊŋÒÓỎỌÔỐỒỔỖỘỐỒỔỖỘƠỚỜỞỠỢÕÖòóỏọôốồổỗộơớờỡợởõöŌōŎŏŐőŒœØøŔŕŖŗŘřßŚśŜŝŞşŠšŢţŤťŦŧÙÚỦỤƯỪỨỬỮỰÛÜùúủụûưứừửữựüŨũŪūŬŭŮůŰűŲųŴŵÝýÿŶŷŸŹźŻżŽžёЁ',
        '123AAAAAAAAAAAAAAaaaaaaaaaaaaaaAaAAAAAAaaaaaaAaCcCcCcCcCcDdDdEEEEEEEEEeeeeeeeeeEeEeEeEeEeGgGgGgGgHhHhIIIIIIIiiiiiiiIiIiIiIiIiJjKkkLlLlLlLlLlNnNnNnNnnNnOOOOOOOOOOOOOOOOOOOOOOOooooooooooooooooooOoOoOoEeOoRrRrRrSSsSsSsSsTtTtTtUUUUUUUUUUUUuuuuuuuuuuuuUuUuUuUuUuUuWwYyyYyYZzZzZzеЕ'));
      $func$ LANGUAGE sql IMMUTABLE;

      -- Tạo configuration
      CREATE TEXT SEARCH CONFIGURATION vietnamese (
          COPY = simple
      );

      -- Tạo cột document_vector nếu chưa tồn tại
      ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_vector tsvector;

      -- Cập nhật trigger với setweight
      CREATE OR REPLACE FUNCTION update_document_vector()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.document_vector :=
              setweight(to_tsvector('vietnamese', vn_unaccent(COALESCE(NEW.title, ''))), 'A') ||
              setweight(to_tsvector('vietnamese', vn_unaccent(COALESCE(NEW.description, ''))), 'B') ||
              setweight(to_tsvector('vietnamese', vn_unaccent(COALESCE(NEW.content, ''))), 'D');
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER document_vector_trigger
      BEFORE INSERT OR UPDATE ON documents
      FOR EACH ROW EXECUTE FUNCTION update_document_vector();

      -- Tạo GIN index
      CREATE INDEX IF NOT EXISTS document_vector_idx ON documents USING GIN(document_vector);

      -- Cập nhật document_vector cho các bản ghi hiện có
      UPDATE documents
      SET document_vector =
          setweight(to_tsvector('vietnamese', vn_unaccent(COALESCE(title, ''))), 'A') ||
          setweight(to_tsvector('vietnamese', vn_unaccent(COALESCE(description, ''))), 'B') ||
          setweight(to_tsvector('vietnamese', vn_unaccent(COALESCE(content, ''))), 'D');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS document_vector_trigger ON documents;
      DROP FUNCTION IF EXISTS update_document_vector;
      DROP TEXT SEARCH CONFIGURATION IF EXISTS vietnamese;
      DROP FUNCTION IF EXISTS vn_unaccent;
      DROP INDEX IF EXISTS document_vector_idx;
      ALTER TABLE documents DROP COLUMN IF EXISTS document_vector;
    `);
  }
}
