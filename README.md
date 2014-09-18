# Jackfruit: A simple and easy multi tenant Node.JS stateless web framework

A multi tenant Node.JS framework, took some inspiration from Grails.


_**Disclaimer**_:
1. It has no intention to be a replacement for Express or other frameworks.
It has no intention to be a highly configurable modular framework, instead generalization and abstraction is kept as minimum as possible.
2. It is **_Stateless_** i.e. no session handling is implemented and neither there is any plan for it.

## Tutorial
1. Start the server as: node `index.js`, define port in the index.js
2. Apps are located under the `sites` folder
3. A demo app is given: `app1`
4. `app1/index.js`: customize routes
5. `app1/public`: All public files e.g. views, images etc. Can have subdirectory as you need.
6. `app1/controller`: Define your controllers
7. `app1/commands`: Place your command object. Command objects are instantiated and populated with the request parameters matching keys. They can be used to separate input validation from controllers. Inspired by Grails commands but very very simple.



## Release 1.0
1. Initial release

### ToDo
1. Gulp integration for all site gulp files.
2. Yeoman generator
3. Better log support.
4. More test coverage ;-) 
5. Profile and optimize

