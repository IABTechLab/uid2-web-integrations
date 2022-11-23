import View from "./View.js";

export default class ContentView extends View {
  constructor(navigateTo, params) {
    super(navigateTo, params);
  }

  async getHtml() {
    return `
      View content ${this.params.id}
      <table id="uid2_state">
      <tr>
          <td class="label">Ready for Targeted Advertising:</td>
          <td class="value">${
            __uid2.getAdvertisingToken() ? "yes" : "no"
          }</td>
      </tr>
      <tr>
          <td class="label">UID2 Advertising Token:</td>
          <td class="value">${__uid2.getAdvertisingToken()}</td>
      </tr>
      <tr>
          <td class="label">Is UID2 Login Required?</td>
          <td class="value">${
            __uid2.isLoginRequired() ? "yes" : "no"
          }</td>
      </tr>
  </table>
  `;
  }
}
