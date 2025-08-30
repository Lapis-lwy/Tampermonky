// ==UserScript==
// @name         PixivInfo
// @namespace    http://tampermonkey.net/
// @version      4.3
// @description  查看本地是否存在该图片
// @author       Lapis_lwy
// @match        *://www.pixiv.net/*
// @match        *://danbooru.donmai.us/*
// @icon         https://www.pixiv.net/favicon.ico
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      file.125114.xyz
// @updateURL    https://raw.githubusercontent.com/Lapis-lwy/Tampermonky/refs/heads/main/PixivInfo.user.js
// @downloadURL  https://raw.githubusercontent.com/Lapis-lwy/Tampermonky/refs/heads/main/PixivInfo.user.js
// ==/UserScript==
//TODO:增加打开图片列表时显示是否在本地有图片
let _wr = function (type) {
    let orig = history[type];
    return function () {
        let rv = orig.apply(this, arguments);
        let e = new Event(type);
        e.arguments = arguments;
        window.dispatchEvent(e);
        return rv;
    };
};
let noneArr = [undefined, ""];
function loginUi(div) {
    let log = document.createElement("div");
    log.id = "login";
    let userTip = document.createElement("lable");
    userTip.textContent = "用户名：";
    userTip.style.fontSize = "16px";
    log.append(userTip);
    let user = document.createElement("input");
    user.type = "text";
    user.id = "username";
    user.placeholder = "请输入用户名";
    userTip.htmlFor = "username";
    log.append(user);
    let space = document.createElement("lable");
    space.style.fontSize = "16px";
    space.textContent = "  ";
    log.append(space);
    let passTip = document.createElement("lable");
    passTip.style.fontSize = "16px";
    passTip.textContent = "密码：";
    log.append(passTip);
    let passwd = document.createElement("input");
    passwd.type = "password";
    passwd.id = "password";
    passwd.placeholder = "请输入密码";
    passTip.htmlFor = "password";
    log.append(passwd);
    log.style.display = "none";
    let btn = document.createElement("button");
    btn.innerHTML = "登录";
    log.append(btn);
    if (noneArr.includes(GM_getValue("username")) || noneArr.includes(GM_getValue("password"))) {
        log.style.display = "block";
    }
    div.append(log);
    return { userElem: user, passwordElem: passwd, buttonElem: btn, loginElem: log }
}
async function login(url) {
    //空字符串
    if (noneArr.includes(GM_getValue("username")) || noneArr.includes(GM_getValue("password")))
        return await new Promise((rej) => rej("-1"));
    //登录
    return await new Promise((res, rej) => {
        GM_xmlhttpRequest({
            method: "POST", url: url + "login", data: '{"username":"' + GM_getValue("username") + '","password":"' + GM_getValue("password") + '","recaptcha":""}',
            onload: (response) => {
                if (response.responseText.trim() === "403 Forbidden" || response.status == "502") {
                    rej(response.status);
                } else {
                    GM_setValue("auth", response.responseText);
                    res();
                }
            }
        });
    });
}
function loginRes(login, loginUiElem) {
    return login.then(() => {
        loginUiElem.loginElem.innerHTML = "";
        let suc = document.createElement("h3");
        suc.textContent = "登录成功！";
        suc.style.margin = "0px";
        suc.style.padding = "12px";
        suc.style.color = "green";
        loginUiElem.loginElem.append(suc);
        loginUiElem.loginElem.style.display = "block";
    }, (rej) => {
        if (rej == "502") {
            alert("服务器异常，请稍后重试！");
            return;
        }
        if (rej == "403") {
            alert("用户名或密码错误！");
            loginUiElem.loginElem.style.display = "block";
            GM_setValue("username", "");
            GM_setValue("password", "");
        }
        if (rej == "-1") {
            loginUiElem.loginElem.style.display = "block";
        }
    });
}
function loginEvent(url, loginUiElem) {
    if (noneArr.includes(GM_getValue("username")) || noneArr.includes(GM_getValue("password"))) {
        GM_setValue("username", loginUiElem.userElem.value);
        GM_setValue("password", loginUiElem.passwordElem.value);
    }
    return loginRes(login(url), loginUiElem);
}
function infoUi(div, url, loginUiElem) {
    GM_setValue("auth", "");
    let tip = document.createElement("h2");
    tip.align = "center";
    tip.style.margin = "0px";
    tip.style.padding = "12px";
    tip.id = "tip";
    div.append(tip);
    let clickEvent = function (url, tip) {
        if (noneArr.includes(GM_getValue("username")) || noneArr.includes(GM_getValue("password"))) {
            tip.textContent = "⚠️您还未登录！";
            return;
        }
        search(url + "search/").then(() => {
            if (GM_getValue("download") === 0) {
                tip.textContent = "✔️本图片尚未下载";
                tip.style.color = "green";
            }
            if (GM_getValue("download") === 1) {
                tip.textContent = "❌️本图片已下载";
                tip.style.color = "red";
            }
        })
    }
    loginEvent(url,loginUiElem).finally(() => clickEvent(url, tip));
    loginUiElem.buttonElem.onclick = () => {
        if (loginUiElem.userElem.value === "" || loginUiElem.passwordElem.value === "") {
            alert("输入框为空！");
            return;
        }
        loginEvent(url,loginUiElem).finally(() => clickEvent(url, tip));
    };

}
async function search(url) {
    let flag = -1;
    let picId;
    if (window.location.hostname == "www.pixiv.net") {
        flag++;
        picId = window.location.href.split("/").at(-1);
    } else {
        let fullUrl = document.querySelector("#post-info-source").textContent;
        if (fullUrl.split(" ").at(1).split("/").at(0) === "pixiv.net") {//Pixiv来源
            picId = fullUrl.split(" ").at(1).split("/").at(-1).split(" ").at(0);
            await pixiv(url, picId);
            if (GM_getValue("download") === 1) return await new Promise(res => { res() });
        }
        if (document.querySelector("#image").src.split("/")[3] === "sample")
            picId = document.querySelector("#image").src.split("-").at(-1).split(".").at(0);
        else
            picId = document.querySelector("#image").src.split("_").at(-1).split(".").at(0);
    }
    return await sendReq(url, flag, picId);
}
function sendReq(url, flag, picId) {
    return new Promise(res => {
        GM_xmlhttpRequest({
            method: "GET", url: url + "/?query=" + picId, headers: {
                "x-auth": GM_getValue("auth")
            }, onload: (response) => {
                let arr = new Set(JSON.parse(response.responseText).map(function (elem) { return elem.path.split("_").at(flag).split(".").at(0).split("/").at(-1) }));
                console.log(arr);
                GM_setValue("download", 0);
                for (let elem of arr) {
                    if (elem === picId) {
                        GM_setValue("download", 1);
                        break;//检查id是否完全相等，有些id是另一个id的一部分
                    }
                }
                res();
            }
        })
    })
}
function pixiv(url, pixivId) {
    return sendReq(url, 0, pixivId);
}
function infoList(div, url, loginUiElem) {
    let hst_name = console.log(window.location.host);
    loginUiElem.buttonElem.onclick = () => {
        if (loginUiElem.userElem.value === "" || loginUiElem.passwordElem.value === "") {
            alert("输入框为空！");
            return;
        }

    };
}
(function () {
    'use strict';
    GM_setValue("auth", "");
    let div = document.createElement("div");
    let path = window.location.pathname;
    let url = "https://file.125114.xyz:27567/api/";
    div.style.backgroundColor = "white";
    div.id = "infoDisplay";
    let loginUiElem = loginUi(div);
    document.body.prepend(div);
    let regex_danbooru = /posts/g;
    let regex_pixiv = /(tags|artworks)/g;
    if (regex_danbooru.test(path) || regex_pixiv.test(path)) {
        regex_danbooru = /posts\//g;
        regex_pixiv = /artworks/g;
        if (regex_danbooru.test(path) || regex_pixiv.test(path))
            infoUi(div, url, loginUiElem);
        else
            infoList(div, url, loginUiElem);
    }
    history.pushState = _wr('pushState');
    window.addEventListener('pushState', function (e) {
        console.warn("href changed to " + window.location.href)
        path = window.location.pathname.split("/")[1];
        let element = document.getElementById('tip');
        if (element)
            element.remove();
        if (path == "artworks") {
            infoUi(div, url, loginUiElem);
        } else if (path == "tags") {
            infoList(div, url, loginUiElem);
        } else {
            div.innerHTML = "";
            div.style.display = "none";
        }
    }
    )
})();
