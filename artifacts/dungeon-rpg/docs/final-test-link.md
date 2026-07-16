# Fixed balance test link

The completed balance integration uses the fixed project root:

`https://ys2mm422yb-max.github.io/DungeonVeil/`

The deployment workflow must publish the complete tested branch build to this project root. The link is valid only when final CI, the four-device browser regression and the Pages deployment all complete successfully for the exact same commit. Publishing this test build does not authorize a merge or a final release.

The explicit test-publication approval is recorded by a `[deploy-test]` commit on the integration branch.
