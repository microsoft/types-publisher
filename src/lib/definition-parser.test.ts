import { createMockDT } from "../mocks";

import { getTypingInfo } from "./definition-parser";

describe(getTypingInfo, () => {
    describe("concerning parallel versions", () => {
        it("returns a single entry based on major version", () => {
            const fs = createMockDT().pkgFS("jquery");
            const versions = Object.keys(getTypingInfo("jquery", fs));
            expect(versions).toEqual(["3"]);
        });

        it("returns multiple entries based on major version", () => {
            const dt = createMockDT();

            const v3 = dt.pkgDir("jquery");
            const v2 = v3.subdir("v2");

            const index = v3.get("index.d.ts") as string;
            const tsconfig = JSON.parse(v3.get("tsconfig.json") as string);

            v2.set("index.d.ts", index.replace("3.3", "2.2"));
            v2.set("tsconfig.json", JSON.stringify({
                ...tsconfig,
                compilerOptions: {
                    ...tsconfig.compilerOptions,
                    paths: {
                        jquery: ["jquery/v2"],
                    },
                },
            }));

            const versions = Object.keys(getTypingInfo("jquery", dt.pkgFS("jquery")));
            expect(versions.sort()).toEqual(["2", "3"]);
        });
    });
});
