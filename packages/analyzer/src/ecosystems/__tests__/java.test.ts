import * as fs from "node:fs";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { makeFixtureRepo } from "../../__fixtures__/make-fixture-repo";
import { readJavaDependencyNames } from "../java";

let tempDirs: string[] = [];
beforeEach(() => {
  tempDirs = [];
});
afterEach(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
function seed(files: Record<string, string>): string {
  const dir = makeFixtureRepo(files);
  tempDirs.push(dir);
  return dir;
}

describe("readJavaDependencyNames", () => {
  it("extracts artifactIds from <dependency> blocks in pom.xml, not <parent>/<plugin> blocks", () => {
    const dir = seed({
      "pom.xml": `<project>
  <parent>
    <artifactId>spring-boot-starter-parent</artifactId>
  </parent>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
      <groupId>com.h2database</groupId>
      <artifactId>h2</artifactId>
    </dependency>
  </dependencies>
  <build>
    <plugins>
      <plugin>
        <artifactId>maven-compiler-plugin</artifactId>
      </plugin>
    </plugins>
  </build>
</project>`,
    });

    const names = readJavaDependencyNames(dir);

    expect(names.has("spring-boot-starter-web")).toBe(true);
    expect(names.has("h2")).toBe(true);
    expect(names.has("spring-boot-starter-parent")).toBe(false);
    expect(names.has("maven-compiler-plugin")).toBe(false);
  });

  it("extracts artifact names from build.gradle (Groovy DSL), both quote and paren styles", () => {
    const dir = seed({
      "build.gradle": `
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation("com.google.guava:guava:31.1-jre")
    testImplementation 'junit:junit:4.13.2'
}`,
    });

    const names = readJavaDependencyNames(dir);

    expect(names).toEqual(new Set(["spring-boot-starter-web", "guava", "junit"]));
  });

  it("extracts artifact names from build.gradle.kts (Kotlin DSL)", () => {
    const dir = seed({
      "build.gradle.kts": `
dependencies {
    implementation("io.quarkus:quarkus-resteasy-reactive")
}`,
    });

    const names = readJavaDependencyNames(dir);

    expect(names).toEqual(new Set(["quarkus-resteasy-reactive"]));
  });

  it("returns an empty set when no Java manifest exists", () => {
    const dir = seed({ "README.md": "# hi" });
    expect(readJavaDependencyNames(dir)).toEqual(new Set());
  });
});
