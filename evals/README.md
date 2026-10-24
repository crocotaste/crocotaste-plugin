# Evals

Cases for `claude plugin eval`, written to check two things: that the right skill fires on a plain request (and stays quiet on an unrelated one), and that the brand book comes out whole and specific to the product.

These runs call the model and cost money. CI never runs them. `--max-cost-usd` caps the spend. Run them by hand, from the root of the plugin:

```bash
claude plugin eval . --allow-tools Bash Write Edit --max-cost-usd 10 --no-publish --scaffold
```

`--scaffold` is needed for `guidelines-output`: its `scaffold.sh` copies `fixtures/brief.md` to `docs/design/brief.md` in the empty workspace, as the skill expects. `--allow-tools` takes the tools separated by spaces. Add `--case 'guidelines-output'` or `--tag routing` to run part of the suite.

## Cases

| Case                    | Prompt                                                | Passes when                                                                           |
| ----------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `branding-triggers`     | "Let's make a brand for my habit tracker app..."      | the `branding` skill fires                                                            |
| `extract-triggers`      | "Write a DESIGN.md for this repo."                    | the `extract` skill fires                                                             |
| `mockups-triggers`      | "Mock up the settings page."                          | the `mockups` skill fires                                                             |
| `install-triggers`      | "Keep the design from drifting on pull requests."     | the `install` skill fires                                                             |
| `build-todo-no-trigger` | "Let's build a todo app."                             | no `crocotaste` skill fires                                                           |
| `fix-bug-no-trigger`    | "Fix this bug: the submit button does nothing."       | no `crocotaste` skill fires                                                           |
| `guidelines-output`     | "The brief ... is approved. Write the brand book ..." | the files exist, hold ten chapters, a sidebar and a dark theme, and read as the brief |

The two no-trigger cases assert an absence (`min: 0`, `max: 0`, on both arms). For those two, also read the with and without comparison in the report by hand: a skill that fires in neither arm is the right result, and a skill that fires only with the plugin is the failure.

`guidelines-output` counts the ten chapters with one `count:10` grader on `data-chapter="01"` to `"10"`. Its only `llm` grader checks that the palette, faces and copy come from the brief (Tidewater, a tide and fishing-window planner) and not from the template's sample: a clinic calendar called Sample, in teal and terracotta.
