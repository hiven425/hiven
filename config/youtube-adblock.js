/*
 * Name: MYGA: Make Youtube Great Again (Shadowrocket Script)
 * Author: Converted for Shadowrocket by Gemini
 * Description: Blocks YouTube ads by modifying the player API response.
 * 原作者: ggby
 */

// 脚本执行的入口点
(() => {
    // 检查是否为有效的响应体
    if (typeof $response === 'undefined' || !$response.body) {
        $done({});
        return;
    }

    // 要从API响应中移除的广告相关的键
    const adKeysToRemove = ["adPlacements", "playerAds", "adSlots", "adBreakHeartbeatParams"];

    try {
        // 解析响应体为JSON对象
        let body = JSON.parse($response.body);

        // 检查是否存在广告相关的键
        let hasAds = adKeysToRemove.some(key => body.hasOwnProperty(key) && body[key] !== null);

        if (hasAds) {
            console.log("MYGA for Shadowrocket: Detected and removing ad data from player response.");

            // 遍历并删除所有广告相关的键
            adKeysToRemove.forEach(key => {
                delete body[key];
            });

            // 将修改后的对象转换回JSON字符串，并作为新的响应体
            $done({ body: JSON.stringify(body) });
        } else {
            // 如果没有发现广告，直接返回原始响应体，不做任何修改
            $done({});
        }
    } catch (e) {
        console.error("MYGA for Shadowrocket: Failed to parse or modify response body.", e);
        // 如果解析失败，返回原始响应体以避免破坏正常功能
        $done({});
    }
})();
