var nineAnime = {
    baseURL: "https://9anime.to",
    type: "anime",
    supportsMalsync: true,
    disableAutoDownload: false,
    disabled: false,
    name: "9anime",
    shortenedName: "9anime",
    searchApi: async function (query) {
        const searchDOM = new DOMHandler();
        try {
            const vrf = await this.getVRF(query, "9anime-search");
            const searchHTML = await MakeFetchZoro(`https://9anime.to/filter?keyword=${encodeURIComponent(query)}&${vrf[1]}=${vrf[0]}`);
            searchDOM.innerHTML = DOMPurify.sanitize(searchHTML);
            const searchElem = searchDOM.document.querySelector("#list-items");
            const searchItems = searchElem.querySelectorAll(".item");
            const response = [];
            if (searchItems.length === 0) {
                throw new Error("No results found.");
            }
            for (let i = 0; i < searchItems.length; i++) {
                const currentElem = searchItems[i];
                response.push({
                    "name": currentElem.querySelector(".name").innerText,
                    "id": currentElem.querySelector(".name").getAttribute("href").replace("/watch/", ""),
                    "image": currentElem.querySelector("img").src,
                    "link": "/" + currentElem.querySelector(".name").getAttribute("href").replace("/watch/", "") + "&engine=5"
                });
            }
            return { "data": response, "status": 200 };
        }
        catch (err) {
            throw err;
        }
    },
    getAnimeInfo: async function (url) {
        const settled = "allSettled" in Promise;
        const id = (new URLSearchParams(`?watch=${url}`)).get("watch").split(".").pop();
        let response = {
            "name": "",
            "image": "",
            "description": "",
            "episodes": [],
            "mainName": ""
        };
        try {
            if (settled) {
                let anilistID;
                try {
                    anilistID = JSON.parse(await MakeFetch(`https://raw.githubusercontent.com/MALSync/MAL-Sync-Backup/master/data/pages/9anime/${id}.json`)).aniId;
                }
                catch (err) {
                    // anilistID will be undefined
                }
                if (anilistID) {
                    const promises = [
                        this.getAnimeInfoInter(url),
                        MakeFetchTimeout(`https://api.enime.moe/mapping/anilist/${anilistID}`, {}, 2000)
                    ];
                    const promiseResponses = await Promise.allSettled(promises);
                    if (promiseResponses[0].status === "fulfilled") {
                        response = promiseResponses[0].value;
                        if (promiseResponses[1].status === "fulfilled") {
                            try {
                                const metaData = JSON.parse(promiseResponses[1].value).episodes;
                                const metaDataMap = {};
                                for (let i = 0; i < metaData.length; i++) {
                                    metaDataMap[metaData[i].number] = metaData[i];
                                }
                                for (let i = 0; i < response.episodes.length; i++) {
                                    const currentEp = metaDataMap[response.episodes[i].id];
                                    const currentResponseEp = response.episodes[i];
                                    currentResponseEp.description = currentEp === null || currentEp === void 0 ? void 0 : currentEp.description;
                                    currentResponseEp.thumbnail = currentEp === null || currentEp === void 0 ? void 0 : currentEp.image;
                                    currentResponseEp.date = new Date(currentEp === null || currentEp === void 0 ? void 0 : currentEp.airedAt);
                                    currentResponseEp.title = `Episode ${currentResponseEp.id} - ${currentEp === null || currentEp === void 0 ? void 0 : currentEp.title}`;
                                }
                            }
                            catch (err) {
                                console.error(err);
                            }
                        }
                        return response;
                    }
                    else {
                        throw promiseResponses[0].reason;
                    }
                }
                else {
                    return await this.getAnimeInfoInter(url);
                }
            }
            else {
                return await this.getAnimeInfoInter(url);
            }
        }
        catch (err) {
            console.error(err);
            throw err;
        }
    },
    getAnimeInfoInter: async function (url, nextPrev = false) {
        url = url.split("&engine")[0];
        const response = {
            "name": "",
            "image": "",
            "description": "",
            "episodes": [],
            "mainName": ""
        };
        let id = url.replace("?watch=/", "");
        const rawURL = `https://9anime.to/watch/${id}`;
        const episodesDOM = new DOMHandler();
        const infoDOM = new DOMHandler();
        try {
            let infoHTML = await MakeFetchZoro(`https://9anime.to/watch/${id}`);
            infoDOM.innerHTML = DOMPurify.sanitize(infoHTML);
            let nineAnimeID = infoDOM.document.querySelector("#watch-main").getAttribute("data-id");
            let infoMainDOM = infoDOM.document.querySelector("#w-info").querySelector(".info");
            response.mainName = id;
            response.name = infoMainDOM.querySelector(".title").innerText;
            response.description = infoMainDOM.querySelector(".content").innerText;
            response.image = infoDOM.document.querySelector("#w-info").querySelector("img").getAttribute("src");
            try {
                response.genres = [];
                const metaCon = infoDOM.document.querySelector(".bmeta").querySelector(".meta");
                for (const genreAnchor of metaCon.querySelectorAll("a")) {
                    const href = genreAnchor.getAttribute("href");
                    if (href && href.includes("/genre/")) {
                        response.genres.push(genreAnchor.innerText);
                    }
                }
            }
            catch (err) {
                console.error(err);
            }
            let episodes = [];
            let IDVRF = await this.getVRF(nineAnimeID, "ajax-episode-list");
            let episodesHTML = "";
            try {
                const tempResponse = JSON.parse(await MakeFetchZoro(`https://9anime.to/ajax/episode/list/${nineAnimeID}?${IDVRF[1]}=${IDVRF[0]}`));
                if (tempResponse.result) {
                    episodesHTML = tempResponse.result;
                }
                else {
                    throw new Error("Couldn't find the result");
                }
            }
            catch (err) {
                throw new Error(`Error 9ANIME_INFO_JSON: The JSON could be be parsed. ${err.message}`);
            }
            episodesDOM.innerHTML = DOMPurify.sanitize(episodesHTML);
            let episodeElem = episodesDOM.document.querySelectorAll("li");
            for (let i = 0; i < episodeElem.length; i++) {
                let curElem = episodeElem[i];
                let title = "";
                try {
                    title = curElem.querySelector("span").innerText;
                }
                catch (err) {
                    console.warn("Could not find the title");
                }
                episodes.push({
                    "isFiller": curElem.querySelector("a").getAttribute("class").includes("filler"),
                    "link": (nextPrev ? "" : "?watch=") + encodeURIComponent(id) + "&ep=" + curElem.querySelector("a").getAttribute("data-ids") + "&engine=5",
                    "id": curElem.querySelector("a").getAttribute("data-num"),
                    "sourceID": curElem.querySelector("a").getAttribute("data-ids"),
                    "title": nextPrev ? title : `Episode ${curElem.querySelector("a").getAttribute("data-num")} - ${title}`,
                    "altTitle": `Episode ${curElem.querySelector("a").getAttribute("data-num")}`
                });
            }
            response.episodes = episodes;
            return response;
        }
        catch (err) {
            err.url = rawURL;
            throw err;
        }
    },
    getLinkFromUrl: async function (url) {
        url = "watch=" + url;
        const response = {
            sources: [],
            name: "",
            title: "",
            nameWSeason: "",
            episode: "",
            status: 400,
            message: "",
            next: null,
            prev: null
        };
        const serverDOM = new DOMHandler();
        try {
            const searchParams = new URLSearchParams(url);
            const sourceEp = searchParams.get("ep");
            const sourceEpVRF = await this.getVRF(sourceEp, "ajax-server-list");
            const promises = [];
            const serverHTML = JSON.parse(await MakeFetchZoro(`https://9anime.to/ajax/server/list/${sourceEp}?${sourceEpVRF[1]}=${sourceEpVRF[0]}`)).result;
            serverDOM.innerHTML = DOMPurify.sanitize(serverHTML);
            const allServers = serverDOM.document.querySelectorAll("li");
            try {
                response.episode = serverDOM.document.querySelector("b").innerText.split("Episode")[1];
            }
            catch (err) {
                response.episode = serverDOM.document.querySelector("b").innerText;
            }
            response.name = searchParams.get("watch");
            response.nameWSeason = searchParams.get("watch");
            response.status = 200;
            let sources = [];
            let vidstreamIDs = [];
            let mCloudIDs = [];
            let filemoonIDs = [];
            for (let i = 0; i < allServers.length; i++) {
                let currentServer = allServers[i];
                let type = i.toString();
                try {
                    const tempType = currentServer.parentElement.previousElementSibling
                        .innerText
                        .trim();
                    if (tempType) {
                        type = tempType;
                    }
                }
                catch (err) {
                    console.warn(err);
                }
                if (currentServer.innerText.toLowerCase() == "vidstream") {
                    vidstreamIDs.push({
                        id: currentServer.getAttribute("data-link-id"),
                        type
                    });
                }
                else if (currentServer.innerText.toLowerCase() == "filemoon") {
                    filemoonIDs.push({
                        id: currentServer.getAttribute("data-link-id"),
                        type
                    });
                }
                else if (currentServer.innerText.toLowerCase() == "mycloud") {
                    mCloudIDs.push({
                        id: currentServer.getAttribute("data-link-id"),
                        type
                    });
                }
            }
            async function addSource(ID, self, index, extractor = "vidstream") {
                try {
                    const serverVRF = await self.getVRF(ID, "ajax-server");
                    const serverData = JSON.parse(await MakeFetchZoro(`https://9anime.to/ajax/server/${ID}?${serverVRF[1]}=${serverVRF[0]}`)).result;
                    const serverURL = serverData.url;
                    const sourceDecrypted = await self.decryptSource(serverURL);
                    let source = {
                        "name": "",
                        "type": "",
                        "url": "",
                    };
                    if (extractor == "vidstream") {
                        const vidstreamID = sourceDecrypted.split("/").pop();
                        const m3u8File = await self.getVidstreamLink(vidstreamID);
                        source = {
                            "name": "HLS#" + index,
                            "type": "hls",
                            "url": m3u8File,
                        };
                        sources.push(source);
                    }
                    else if (extractor == "filemoon") {
                        const filemoonHTML = await MakeFetch(sourceDecrypted);
                        const m3u8File = await self.getFilemoonLink(filemoonHTML);
                        source = {
                            "name": "Filemoon#" + index,
                            "type": m3u8File.includes(".m3u8") ? "hls" : "mp4",
                            "url": m3u8File,
                        };
                        sources.push(source);
                    }
                    else {
                        const mCloudID = sourceDecrypted.split("/").pop();
                        const m3u8File = await self.getVidstreamLink(mCloudID, false);
                        source = {
                            "name": "Mycloud#" + index,
                            "type": m3u8File.includes(".m3u8") ? "hls" : "mp4",
                            "url": m3u8File,
                        };
                        sources.push(source);
                    }
                    if ("skip_data" in serverData) {
                        serverData.skip_data = JSON.parse(await self.decryptSource(serverData.skip_data));
                        source.skipIntro = {
                            start: serverData.skip_data.intro[0],
                            end: serverData.skip_data.intro[1]
                        };
                    }
                }
                catch (err) {
                    console.warn(err);
                }
            }
            for (let i = 0; i < vidstreamIDs.length; i++) {
                promises.push(addSource(vidstreamIDs[i].id, this, vidstreamIDs[i].type));
            }
            for (let i = 0; i < filemoonIDs.length; i++) {
                promises.push(addSource(filemoonIDs[i].id, this, filemoonIDs[i].type, "filemoon"));
            }
            for (let i = 0; i < mCloudIDs.length; i++) {
                promises.push(addSource(mCloudIDs[i].id, this, mCloudIDs[i].type, "mycloud"));
            }
            let settledSupported = "allSettled" in Promise;
            let epList = [];
            if (settledSupported) {
                promises.unshift(this.getAnimeInfoInter(`?watch=/${searchParams.get("watch")}`, true));
                const promiseResult = await Promise.allSettled(promises);
                if (promiseResult[0].status === "fulfilled") {
                    epList = promiseResult[0].value.episodes;
                }
            }
            else {
                try {
                    await Promise.all(promises);
                    epList = (await this.getAnimeInfoInter(`?watch=/${searchParams.get("watch")}`, true)).episodes;
                }
                catch (err) {
                    console.error(err);
                }
            }
            let check = false;
            for (var i = 0; i < epList.length; i++) {
                if (check === true) {
                    response.next = epList[i].link;
                    break;
                }
                if (epList[i].sourceID == sourceEp) {
                    check = true;
                    response.title = epList[i].title;
                }
                if (check === false) {
                    response.prev = epList[i].link;
                }
            }
            if (!sources.length) {
                throw new Error("No sources were found. Try again later or contact the developer.");
            }
            if (parseFloat(response.episode) === 0) {
                response.episode = "0.1";
            }
            response.sources = sources;
            return response;
        }
        catch (err) {
            throw err;
        }
    },
    checkConfig: function () {
        if (!localStorage.getItem("9anime")) {
            throw new Error("9anime URL not set");
        }
        if (!localStorage.getItem("apikey")) {
            throw new Error("API keynot set");
        }
    },
    getVRF: async function (query, action) {
        let fallbackAPI = false;
        let nineAnimeURL = "9anime.eltik.net";
        let apiKey = "enimax";
        try {
            this.checkConfig();
            nineAnimeURL = localStorage.getItem("9anime").trim();
            apiKey = localStorage.getItem("apikey").trim();
            fallbackAPI = false;
        }
        catch (err) {
            console.warn("Defaulting to Consumet.");
        }
        let reqURL = `https://${nineAnimeURL}/${action}?query=${encodeURIComponent(query)}&apikey=${apiKey}`;
        if (fallbackAPI) {
            reqURL = `https://${nineAnimeURL}?query=${encodeURIComponent(query)}&action=${action}`;
        }
        const source = await MakeFetch(reqURL);
        try {
            const parsedJSON = JSON.parse(source);
            if (parsedJSON.url) {
                return [encodeURIComponent(parsedJSON.url), parsedJSON.vrfQuery];
            }
            else {
                throw new Error(`${action}-VRF1: Received an empty URL or the URL was not found.`);
            }
        }
        catch (err) {
            throw new Error(`${action}-VRF1: Could not parse the JSON correctly.`);
        }
    },
    decryptSource: async function (query) {
        let fallbackAPI = false;
        let nineAnimeURL = "9anime.eltik.net";
        let apiKey = "enimax";
        try {
            this.checkConfig();
            nineAnimeURL = localStorage.getItem("9anime").trim();
            apiKey = localStorage.getItem("apikey").trim();
            fallbackAPI = false;
        }
        catch (err) {
            console.warn("Defaulting to Consumet.");
        }
        let reqURL = `https://${nineAnimeURL}/decrypt?query=${encodeURIComponent(query)}&apikey=${apiKey}`;
        if (fallbackAPI) {
            reqURL = `https://${nineAnimeURL}?query=${encodeURIComponent(query)}&action=decrypt`;
        }
        const source = await MakeFetch(reqURL);
        try {
            const parsedJSON = JSON.parse(source);
            if (parsedJSON.url) {
                return parsedJSON.url;
            }
            else {
                throw new Error("DECRYPT1: Received an empty URL or the URL was not found.");
            }
        }
        catch (err) {
            throw new Error("DECRYPT0: Could not parse the JSON correctly.");
        }
    },
    getVidstreamLink: async function (query, isViz = true) {
        let fallbackAPI = false;
        let nineAnimeURL = "9anime.eltik.net";
        let apiKey = "enimax";
        try {
            this.checkConfig();
            nineAnimeURL = localStorage.getItem("9anime").trim();
            apiKey = localStorage.getItem("apikey").trim();
            fallbackAPI = false;
        }
        catch (err) {
            console.warn("Defaulting to Consumet.");
        }
        let reqURL = `https://${nineAnimeURL}/raw${isViz ? "Vizcloud" : "Mcloud"}?query=${encodeURIComponent(query)}&apikey=${apiKey}`;
        if (fallbackAPI) {
            reqURL = `https://${nineAnimeURL}?query=${encodeURIComponent(query)}&action=${isViz ? "vizcloud" : "mcloud"}`;
        }
        const rawSource = JSON.parse(await MakeFetch(reqURL)).rawURL;
        const fetchFunc = config.chrome ? MakeFetch : MakeCusReq;
        const source = await fetchFunc(rawSource, {
            headers: {
                "referer": isViz ? "https://vidstream.pro/" : "https://mcloud.to/",
                "x-requested-with": "XMLHttpRequest"
            }
        });
        try {
            const parsedJSON = JSON.parse(source);
            if (parsedJSON.data &&
                parsedJSON.data.media &&
                parsedJSON.data.media.sources &&
                parsedJSON.data.media.sources[0] &&
                parsedJSON.data.media.sources[0].file) {
                return parsedJSON.data.media.sources[0].file;
            }
            else {
                throw new Error("VIZCLOUD1: Received an empty URL or the URL was not found.");
            }
        }
        catch (err) {
            throw new Error("VIZCLOUD0: Could not parse the JSON correctly.");
        }
    },
    getFilemoonLink: async function (filemoonHTML) {
        let fallbackAPI = false;
        let nineAnimeURL = "9anime.eltik.net";
        let apiKey = "enimax";
        try {
            this.checkConfig();
            nineAnimeURL = localStorage.getItem("9anime").trim();
            apiKey = localStorage.getItem("apikey").trim();
            fallbackAPI = false;
        }
        catch (err) {
            console.warn("Defaulting to Consumet.");
        }
        let reqURL = `https://${nineAnimeURL}/filemoon?apikey=${apiKey}`;
        if (fallbackAPI) {
            throw new Error("Not supported");
        }
        const source = await MakeFetch(reqURL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                "query": filemoonHTML
            })
        });
        try {
            const parsedJSON = JSON.parse(source);
            if (parsedJSON.url) {
                return parsedJSON.url;
            }
            else {
                throw new Error("FILEMOON1: Received an empty URL or the URL was not found.");
            }
        }
        catch (err) {
            throw new Error("FILEMOON0: Could not parse the JSON correctly.");
        }
    },
    fixTitle: function (title) {
        try {
            const tempTitle = title.split(".");
            if (tempTitle.length > 1) {
                tempTitle.pop();
                title = tempTitle.join(".");
                return title;
            }
            else {
                return title;
            }
        }
        catch (err) {
            return title;
        }
    },
    discover: async function () {
        let temp = new DOMHandler();
        temp.innerHTML = DOMPurify.sanitize(await MakeFetchZoro(`https://9anime.to/home`, {}));
        temp = temp.document.querySelector(".ani.items");
        let data = [];
        for (const elem of temp.document.querySelectorAll(".item")) {
            let image = elem.querySelector("img").getAttribute("src");
            let name = elem.querySelector(".name.d-title").innerText.trim();
            let link = elem.querySelector(".name.d-title").getAttribute("href");
            const splitLink = link.split("/");
            splitLink.pop();
            link = splitLink.join("/").replace("/watch", "");
            data.push({
                image,
                name,
                link
            });
        }
        return data;
    },
    config: {
        "referer": "https://9anime.to",
    },
    getConfig: function (url) {
        if (url.includes("mcloud.to")) {
            return {
                "referer": "https://mcloud.to/"
            };
        }
        else {
            return this.config;
        }
    },
    getMetaData: async function (search) {
        const id = search.get("watch").split(".").pop();
        return await getAnilistInfo("9anime", id);
    },
    rawURLtoInfo: function (url) {
        // https://9anime.pl/watch/demon-slayer-kimetsu-no-yaiba-the-movie-mugen-train.lj5q
        return `?watch=${url.pathname.replace("/watch", "")}&engine=5`;
    }
};
