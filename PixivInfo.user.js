// ==UserScript==
// @name         PixivInfo
// @namespace    http://tampermonkey.net/
// @version      9.10
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
//TODO:增加识别图集部分图片
/////////////////////////////////////////请求缓存////////////////////////////////////////////////////////////




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
        return await new Promise((res, rej) => rej("-1"));
    //登录
    return await new Promise((res, rej) => {
        GM_xmlhttpRequest({
            method: "POST",
            url: url + "auth/login?username=" + GM_getValue("username"),
            headers: {
                "X-Password": GM_getValue("password")
            },
            onload: (response) => {
                if (response.status === 200) {
                    GM_setValue("auth", response.responseText);
                    res();
                } else {
                    rej(response.status);
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
        setTimeout(() => {
            loginUiElem.loginElem.style.display = "none";
        }, 3000);
    }, (rej) => {
        if (rej === 502) {
            alert("服务器异常，请稍后重试！");
            return;
        }
        if (rej === 403 || rej === 401) {
            alert("用户名或密码错误！");
            loginUiElem.loginElem.style.display = "block";
            GM_setValue("username", "");
            GM_setValue("password", "");
            GM_setValue("auth", "");
        }
        if (rej == "-1") {
            loginUiElem.loginElem.style.display = "block";
        }
    });
}
function loginEvent(url, loginUiElem, event) {
    if (noneArr.includes(GM_getValue("username")) || noneArr.includes(GM_getValue("password"))) {
        GM_setValue("username", loginUiElem.userElem.value);
        GM_setValue("password", loginUiElem.passwordElem.value);
    }
    return loginRes(login(url), loginUiElem).finally(() => {
        if(typeof event==='function')
            event()
    });
}
function infoUi(div, url, loginUiElem) {
    let tip = document.createElement("h2");
    tip.style.textAlign = "center";
    tip.style.margin = "0px";
    tip.style.padding = "12px";
    tip.id = "tip";
    div.append(tip);
    let clickEvent = (url, tip) => {
        if (noneArr.includes(GM_getValue("username")) || noneArr.includes(GM_getValue("password"))) {
            tip.textContent = "⚠️您还未登录！";
            return;
        }
        search(url + "tools/search").then(() => {
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
    loginEvent(url, loginUiElem, () => clickEvent(url, tip));
    loginUiElem.buttonElem.onclick = () => {
        if (loginUiElem.userElem.value === "" || loginUiElem.passwordElem.value === "") {
            alert("输入框为空！");
            return;
        }
        loginEvent(url, loginUiElem, () => clickEvent(url, tip));
    };
    return tip;
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
            picId = fullUrl.split(" ").at(1).split("/").at(-1).split(" ").at(0);
            await pixiv(url, picId);
            return Promise.resolve(GM_getValue("download"));
        }
        if (document.querySelector("#image").src.split("/")[3] === "sample")
            picId = document.querySelector("#image").src.split("-").at(-1).split(".").at(0);
        else
            picId = document.querySelector("#image").src.split("_").at(-1).split(".").at(0);
    }
    return await sendReq(url, flag, picId);
}
function sendReq(url, flag, picId) {
    return new Promise((res, rej) => {
        GM_xmlhttpRequest({
            method: "GET", url: url + "?query=" + picId + "&sources=Image",
            anonymous: true,
            cookie: "filebrowser_quantum_jwt=" + GM_getValue("auth"),
            timeout: 20000,
            onload: (response) => {
                let json = JSON.parse(response.responseText);
                if (Object.keys(json).length != 0)
                    json = json.map(function (elem) { return elem.path.split("_").at(flag).split(".").at(0).split("/").at(-1) })
                else
                    json = []
                let arr = new Set(json);
                let download = 0;
                for (let elem of arr) {
                    if (elem === picId) {
                        download = 1;
                        break;//检查id是否完全相等，有些id是另一个id的一部分
                    }
                }
                GM_setValue("download", download);
                res();
            },
            onerror: (error) => {
                console.error('❌id:' + picId + ' 请求失败', error);
                rej(error)
            },
            ontimeout: () => {
                console.warn('⏰id:' + picId + '请求超时');
                rej(new Error("请求超时"));
            }
        })
    })
}
function pixiv(url, pixivId) {
    return sendReq(url, 0, pixivId);
}
function danbooru(url, danbooruId) {
    return sendReq(url, -1, danbooruId);
}

async function searchList(url, href) {
    let id;
    if (window.location.hostname == "www.pixiv.net") {
        id = href.split("/").at(-1);
        return await pixiv(url, id);
    } else {
        id = href.split("/").at(-1).split(".")[0];
        return await danbooru(url, id);
    }
}
function infoList(url, loginUiElem, hostName) {
    const sleep = (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    };
    const isElementLoaded = async (selector, end, siteNum) => {
        await sleep(2000)
        if (siteNum == 0) {
            while (document.querySelectorAll(selector)[end - 1] === undefined || document.querySelectorAll(selector)[end - 1].href === undefined) {
                await new Promise(res => requestAnimationFrame(res))
            }
        }
        else {
            while (document.querySelectorAll(selector)[end - 1] === undefined || document.querySelectorAll(selector)[end - 1].src === undefined) {
                await new Promise(res => requestAnimationFrame(res))
            }
        }
        return await new Promise(res => {
            res(document.querySelectorAll(selector));
        })
    };
    let listEvent = url => {
        if (noneArr.includes(GM_getValue("username")) || noneArr.includes(GM_getValue("password")))
            return;
        if (hostName === "www.pixiv.net") {
            isElementLoaded("div[class='col-span-2']>div>div:nth-of-type(2)>a", 1, 0).then(res1 => {
                for (let i = 0; i < res1.length; i++) {
                    if (!document.getElementById("status_" + i)) {
                        let status = document.createElement("div");
                        searchList(url + "tools/search", res1[i].href).then(() => {
                            if (GM_getValue("download") === 0) {
                                status.textContent = "✔️";
                            } else {
                                status.textContent = "❌️";
                            }
                            status.id = "status_" + i;
                            res1[i].parentNode.append(status);
                        });
                    }
                }
            })
        } else {
            isElementLoaded(".post-preview-image", 1, 1).then(res1 => {
                for (let i = 0; i < res1.length; i++) {
                    if (!document.getElementById("status_" + i)) {
                        let status = document.createElement("div");
                        searchList(url + "tools/search", res1[i].src).then(res2 => {
                            if (GM_getValue("download") === 0) {
                                status.textContent = "✔️";
                            } else {
                                status.textContent = "❌️";
                            }
                            let elem = document.getElementById("status_" + i)
                            if (elem)
                                elem.remove()
                            status.id = "status_" + i;
                            status.style.position = "absolute";
                            status.style.backgroundColor = "white";
                            status.style.fontSize = "17.5px";
                            status.style.right = "0";
                            res1[i].parentNode.prepend(status);
                        });
                    }
                }
            });
        }
    };
    loginEvent(url, loginUiElem, () => listEvent(url));
    loginUiElem.buttonElem.onclick = () => {
        if (loginUiElem.userElem.value === "" || loginUiElem.passwordElem.value === "") {
            alert("输入框为空！");
            return;
        }
        loginEvent(url, loginUiElem, () => { listEvent(url) });
    };
}
(function () {
    'use strict';
    GM_setValue("auth", "");
    let div = document.createElement("div");
    let path = window.location.pathname;
    let url = "https://file.125114.xyz:23475/api/";
    div.style.backgroundColor = "white";
    div.id = "infoDisplay";
    let loginUiElem = loginUi(div);
    document.body.prepend(div);
    let regexDanbooru = /posts/;
    let regexPixiv = /(tags|artworks)/;
    let tip = null
    if (regexDanbooru.test(path) || regexPixiv.test(path)) {
        regexDanbooru = /posts\//;
        regexPixiv = /artworks/;
        if (regexDanbooru.test(path) || regexPixiv.test(path))
            tip = infoUi(div, url, loginUiElem);
        else
            infoList(url, loginUiElem, window.location.host);
    }
    history.pushState = _wr('pushState');
    window.addEventListener('pushState', function () {
        console.warn("href changed to " + window.location.href)
        if (tip != null) {
            tip.remove()
            tip = null
        }
        let path = window.location.pathname
        let regexDanbooru = /posts/;
        let regexPixiv = /(tags|artworks)/;
        if (regexDanbooru.test(path) || regexPixiv.test(path)) {
            regexDanbooru = /posts\//;
            regexPixiv = /artworks/;
            if (regexDanbooru.test(path) || regexPixiv.test(path))
                tip = infoUi(div, url, loginUiElem);
            else
                infoList(url, loginUiElem, window.location.host);
        }
    }
    )
})();

