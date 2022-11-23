export default class {
  constructor(navigateTo, params) {
    this.params = params;
    this.navigateTo = navigateTo;
  }

  async getHtml() {
    return "";
  }

  async afterRender() {
    return;
  }
}
