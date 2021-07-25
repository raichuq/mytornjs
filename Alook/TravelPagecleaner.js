// ==UserScript==
// @name         Torn旅行界面清理
// @namespace    TornCity
// @version      0.1
// @description  去掉云、飞机、左上小贴士等
// @author       RaichuQ
// @match        https://www.torn.com/index.php
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    var element = document.getElementsByClassName("stage")[0];
    if (element) {
        element.parentNode.removeChild(element);
    }
   element = document.getElementsByClassName("popup-info")[0];
    if (element) {
        element.parentNode.removeChild(element);
    }
})();
