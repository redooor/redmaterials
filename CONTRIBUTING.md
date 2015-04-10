# Contributing to Redmaterials

Your contributions to the project are most welcome. Please review these guidelines before submitting any pull requests to the project.

# Which Branch?

ALL bug fixes should be made to the 0.x branch which they belong. Bug fixes should never be sent to the master branch unless they fix features that exist only in the upcoming release.

# Pull Requests

The pull request process differs for new features and bugs. Before sending a pull request for a new feature, you should first create an issue with [Proposal] in the title. The proposal should describe the new feature, as well as implementation ideas. The proposal will then be reviewed and either approved or denied. Once a proposal is approved, a pull request may be created implementing the new feature. Pull requests which do not follow this guideline will be closed immediately.

Pull requests for bugs may be sent without creating any proposal issue. If you believe that you know of a solution for a bug that has been filed on GitHub, please leave a comment detailing your proposed fix.

# Feature Requests

If you have an idea for a new feature you would like to see added to Redmaterials, you may create an issue on GitHub with [Request] in the title. The feature request will then be reviewed by @kongnir.

# House Rules

* Describe the problem clearly in the Pull Request description
* If you are submitting a bug-fix, or an enhancement that is not a breaking change, submit your pull request to the branch corresponding to the latest stable release of the project, such as the 0.1 branch.
* If you are submitting a breaking change or an entirely new component, submit your pull request to the master branch.
* Do not edit compiled asset files such as redmaterials.css directly. Instead, please edit the LESS files inside the less/ directory and then use a compiler. Such submission should include both the less file and the css file. The Gruntfile.js has been set up to help you compile with Grunt.

# Tab or Space?

Please use 4 spaces as indentation. Do not use tab at all.

# Documentation

All contributions are most welcome.
All deployment-related documentation should be done within our Wiki page.

# Optional Development Tools

We're using these tools in our development of Redmaterials. It'll help if you use the same tool too.
Please feel free to suggest a better alternative.

* [Brackets](http://brackets.io/) for text editing.
* [Brackets Beautify](https://github.com/drewhamlett/brackets-beautify) for auto-indentation. Remember to change the tabSize to 4.
