import { describe, it, expect } from "vitest";
import { DB_TIMEZONE, dbConnectionConfig } from "./dbConfig";

// Bug de zona horaria nº4: razonar con el Date local de mysql2 desplazó 07:04 UTC
// → 05:04Z. La conexión DEBE parsear en UTC ('Z'). Este test lo fija para siempre.
describe("dbConnectionConfig — la conexión SIEMPRE parsea en UTC", () => {
  it("timezone es 'Z' (UTC), nunca la zona local del proceso", () => {
    expect(DB_TIMEZONE).toBe("Z");
    expect(dbConnectionConfig("mysql://u:p@h:3306/db").timezone).toBe("Z");
  });

  it("propaga la uri recibida", () => {
    expect(dbConnectionConfig("mysql://x").uri).toBe("mysql://x");
  });
});
