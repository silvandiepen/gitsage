# 1.0.0 (2025-03-12)


### Bug Fixes

* Escaped single quotes in PR content to prevent command injection ([8097467](https://github.com/silvandiepen/gitsage/commit/8097467c2dafc43e857b409a44d8b948a65a430f))
* Fixed formatting of commit message in createCommit function ([9479f09](https://github.com/silvandiepen/gitsage/commit/9479f09db16ebafdcf21d80d642af551492d1c8a))
* Fixed issue with PR title escaping in generatePR function ([69ecf38](https://github.com/silvandiepen/gitsage/commit/69ecf388b482df32bc57f5843ae868f072f7c564))
* Fixed string quotation style in commit test ([061476d](https://github.com/silvandiepen/gitsage/commit/061476dc7d2cf96db94e5515fb4e5efa67c3b984))
* tests ([5025808](https://github.com/silvandiepen/gitsage/commit/502580816ec35f06c22969e18a32130f69cb4865))


### Features

* Add AI-powered PR content generation feature to README ([8d46829](https://github.com/silvandiepen/gitsage/commit/8d46829ce40ec1093f9f2bec96413cca4df302f8))
* Add branch management functionality ([2f9bf03](https://github.com/silvandiepen/gitsage/commit/2f9bf03d3a90686cb963760c652d97c092b3f6fc))
* Add checks for staged and unstaged changes before renaming commit ([ac5b5fe](https://github.com/silvandiepen/gitsage/commit/ac5b5fe8a0ca05d17e3c2812ee5928f97995f03d))
* Add cli-block package to project dependencies ([aebe4b3](https://github.com/silvandiepen/gitsage/commit/aebe4b3bd10d30a8c99070b4859b83e1f30baf58))
* Add git fixup functionality ([04250f5](https://github.com/silvandiepen/gitsage/commit/04250f59d64bd9caa8c5e60f69814184479c86d3))
* Add git utility functions ([c770588](https://github.com/silvandiepen/gitsage/commit/c77058867b4d842a75678157aa74847c14b8de40))
* Add GitHub Actions CI workflow ([9aa5b30](https://github.com/silvandiepen/gitsage/commit/9aa5b30e485b46899f4cf2966a20b720ffe6a33c))
* Added configuration settings feature to GitSage ([0226493](https://github.com/silvandiepen/gitsage/commit/02264935f2b5defa04fba39523cbed4b2df3b3ce))
* Added GitHub Actions workflow for publishing to NPM ([ee08165](https://github.com/silvandiepen/gitsage/commit/ee08165d140cae7367e8b603a37c7f0275781804))
* Added handling for empty file selection in getGitChanges function ([a1c54d7](https://github.com/silvandiepen/gitsage/commit/a1c54d77e902135579fa970ddeba9e038bb30992))
* Added logging for raw AI responses in OpenAI module ([62a94db](https://github.com/silvandiepen/gitsage/commit/62a94dbef5d208dbcdb7ee33ccd26fbbe7ebf01f))
* Enhance getStagedFiles function to sanitize diff output ([c093330](https://github.com/silvandiepen/gitsage/commit/c09333033c32d8db6551a4d0963dcf2300705fa1))
* Exported analyze module from index file ([e7f2c02](https://github.com/silvandiepen/gitsage/commit/e7f2c024ab2a176cd23cab3740bb9a32fa585da0))
* Integrated OpenAI GPT-4 for generating PR titles in the PR module ([6162dd7](https://github.com/silvandiepen/gitsage/commit/6162dd73106d2ab78cecfe1598f1200408019d4d))
