// @ts-ignore
const extensionList: Array<extension> = [wco, animixplay, fmovies, zoro, twitch, nineAnime, fmoviesto, gogo, mangaDex, mangaFire, viewAsian, anilist];

// @ts-ignore   
const extensionNames = [];
// @ts-ignore
const extensionDisabled = [];
// @ts-ignore
const extensionTypes = [];

for(const extension of extensionList){
    extensionNames.push(extension.name);
    extensionDisabled.push(extension.disabled);
    extensionTypes.push(extension.type);
}