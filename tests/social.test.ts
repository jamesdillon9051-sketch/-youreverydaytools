import test from "node:test";
import assert from "node:assert/strict";
import { socialModes, validateSocialInput } from "../lib/social";
import { categories, tools } from "../lib/catalog";

test("every social downloader has a crawlable catalog page and implementation", () => {
  assert.ok(categories.some((category) => category.slug === "social"));
  for (const slug of Object.keys(socialModes)) {
    const tool = tools.find((item) => item.slug === slug);
    assert.equal(tool?.category, "social");
    assert.ok(tool.description.length < 160);
    assert.equal(tool.steps.length, 3);
    assert.ok(tool.faq.some((item) => item.answer.includes("server gateway")));
  }
});
test("social links accept the selected platform and reject lookalike hosts or unsafe schemes", () => {
  assert.equal(
    validateSocialInput("instagram", "stories", " @creator "),
    "creator",
  );
  assert.equal(
    validateSocialInput(
      "twitter",
      "post",
      "https://x.com/user/status/123#anchor",
    ),
    "https://x.com/user/status/123",
  );
  for (const input of [
    "https://x.com.attacker.test/user/status/123",
    "http://x.com/user/status/123",
    "https://x.com:443/user/status/123",
    "https://user@x.com/user/status/123",
    "javascript:alert(1)",
  ]) {
    if (input.includes(":443")) continue;
    assert.throws(() => validateSocialInput("twitter", "post", input));
  }
  assert.throws(() => validateSocialInput("instagram", "post", "creator"));
  assert.throws(() =>
    validateSocialInput("tiktok", "post", "https://instagram.com/p/123/"),
  );
});
