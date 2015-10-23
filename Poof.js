(function (root) {
    var poofs = "\u202a\u202b\u202c\u202d\u200e\u200f",
        poofsMap = {};

    poofs.split('').forEach(function (value, index) {
        poofsMap[value] = index;
    });

    /**
     * 对字符串进行 Unicode 编码
     *
     * @param {string} str 源字符串
     * @return {string} 返回编码后的内容
     */
    function encodeUnicode(str) {
        return str.replace(/[^\x09-\x7f\ufeff]/g, function (all) {
            return '\\u' + (0x10000 + all.charCodeAt()).toString(16).substring(1);
        });
    }

    /**
     * 将 Unicode 编码解析为字符串
     *
     * @param {string} str Unicode字符串
     * @return {string} 返回的字符串
     */
    function decodeUnicode(str) {
        return decodeURIComponent(str.replace(/\\u([\d\w]{4})/gi, function (match, grp) {
            return String.fromCharCode(parseInt(grp, 16));
        }));
    }

    function Poof(str) {
        if (typeof str !== 'string') {
            throw TypeError('Poof constructor expected a `String` as the first argument');
        }
        Object.defineProperty(this, 'str', {
            value: str
        });
    }

    Poof.encodeUnicode = encodeUnicode;
    Poof.decodeUnicode = function (str) {
        return decodeUnicode(str.replace(/%/g, '%25'));
    };

    var specialACII = [10],
        specialACIIMap = {
            10: 0
        },
        specialACIIStr = JSON.stringify(specialACII);


    Poof.prototype = {
        toString: function () {
            return this.str;
        },
        encode: function () {
            var content = this.content;
            if (!content) {
                content = encodeUnicode(this.str).replace(/[^]/g, function (all) {
                    var charCode = all.charCodeAt(),
                        str,
                        pad = "000";

                    str = "" + charCode.toString(poofs.length);

                    return (pad.substr(0, pad.length - str.length) + str).replace(/[^]/g, function (n) {
                        return poofs[n];
                    });
                });

                Object.defineProperty(this, 'content', {
                    value: content
                });
            }

            return content;
        },

        // 对自身进行解码
        // 用于测试转化的有效性
        decode: function () {
            if (!this.content) {
                this.encode();
            }

            return decodeUnicode(this.content.replace(/./g,function(char){
                return poofsMap[char];
            }).replace(/.{3}/g, function(charCode){
                var code = parseInt(charCode, poofs.length);
                return String.fromCharCode(code);
            }).replace(/%/g, '%25')); // 转换%，防止出现 `URI malformed` 错误
        },

        compile: function (type) {
            var args = [].slice.call(arguments);
            args[0] = this.content;
            return (Poof.complies[type] || Poof.complies.default).apply(null, args);
        }
    };

    var constructorCompile = JSON.stringify(("constructor").split('').map(function (letter) {
        return ~letter.charCodeAt();
    }));

    Poof.complies = {
        default: function (content) {
            return 'atob.constructor("' + content + '".replace(/./g, function (char) {\r\n' +
                '   return' + JSON.stringify(poofsMap) + '[char];\r\n' +
                '}).replace(/.{3}/g, function (charCode) {\r\n' +
                '   return String.fromCharCode(parseInt(charCode,' + poofs.length + '));\r\n' +
                '}))();';
        },

        split: function (content) {
            return '// 第一部分：零宽数据\r\n' +
                'var poofContent = "' + content + '";\r\n' +
                '\r\n' +
                '// 第二部分：解码函数声明\r\n' +
                'function poofDecode() {\r\n' +
                '   return poofContent.replace(/./g, function (char) {\r\n' +
                '       return ' + JSON.stringify(poofsMap) + '[char];\r\n' +
                '   }).replace(/.{3}/g, function (charCode) {\r\n' +
                '       return String.fromCharCode(parseInt(charCode,' + poofs.length + '));\r\n' +
                '   });\r\n' +
                '}\r\n' +
                '\r\n' +
                '// 第三部分：执行代码\r\n' +
                'atob[' + constructorCompile + '.map(function (code) {\r\n' +
                '   return String.fromCharCode(~code);\r\n' +
                '}).join("")](poofDecode())();';
        },

        multiple: function (content, split) {
            var parts =  split || 3,
                i = 0,
                length = Math.ceil(content.length / parts),
                contentString = '';

            for (; i < parts; i++) {

                contentString += 'poofContents.push("' + content.substr(length * i, length) + '");\r\n' +
                    '\r\n';
            }

            return '// 第一部分：分解零宽数据,把零宽数据分割为' + parts + '部分\r\n' +
                'var poofContents = [];\r\n' +
                '\r\n' +
                contentString +
                '// 第二部分：解码字典声明\r\n' +
                'var poofDictionary = {};\r\n' +
                '"' + poofs + '".split("").forEach(function (value, index) {\r\n' +
                '   poofDictionary[value] = index;\r\n' +
                '});\r\n' +
                '\r\n' +
                '// 第三部分：解码函数声明\r\n' +
                'function poofDecode() {\r\n' +
                '   return poofContents.join("").replace(/./g,function(a){' +
                '       return poofDictionary[a];' +
                '   }).replace(/.{3}/g, function (charCode) {\r\n' +
                '       return String.fromCharCode(parseInt(charCode,' + poofs.length + '));\r\n' +
                '   });\r\n' +
                '}\r\n' +
                '\r\n' +
                '// 第四部分：执行代码\r\n' +
                'atob[' + constructorCompile + '.map(function (code) {\r\n' +
                '   return String.fromCharCode(~code);\r\n' +
                '}).join("")](poofDecode())();';
        },

        fake: function (content, text) {
            var fakePoofsMap = [],
                fakeLength = 6,
                fakePoofs = ['number', 'object', 'string', 'module', 'export', 'import'];


            poofs.split('').forEach(function (value, index) {
                fakePoofsMap.push(fakePoofs[index].substr(0, fakeLength) + value);
            });

            if (!text) {
                text = 'object';
            }

            return '// 第一部分：零宽数据\r\n' +
                'var poofContent = "' + text + content + '";\r\n' +
                '\r\n' +
                '// 第二部分：解码函数声明\r\n' +
                'function poofDecode() {\r\n' +
                '   var fakeMap = ' + JSON.stringify(fakePoofsMap) + ',\r\n' +
                '       map = {};\r\n' +
                '   fakeMap.forEach(function (value, index) {\r\n' +
                '       map[value.substr(' + fakeLength + ')] = index;\r\n' +
                '   });\r\n' +
                '   return poofContent.substr(' + text.length + ').replace(/./g, function (char) {\r\n' +
                '       return map[char];\r\n' +
                '   }).replace(/.{3}/g, function (charCode) {\r\n' +
                '       return String.fromCharCode(parseInt(charCode,' + poofs.length + '));\r\n' +
                '   });\r\n' +
                '}\r\n' +
                '\r\n' +
                '// 第三部分：执行代码\r\n' +
                'atob[' + constructorCompile + '.map(function (code) {\r\n' +
                '   return String.fromCharCode(~code);\r\n' +
                '}).join("")](poofDecode())();';
        }
    };

    if (typeof module === "object" && typeof module.exports === "object") {
        // Node.js或RingoJS导出方式
        module.exports = Poof;
    } else {

        // AMD模式导出
        if (typeof define === "function" && typeof define.amd === 'object' && define.amd) {
            define("Poof", [], function () {
                return Poof;
            });
        }

        // 浏览器或Rhino环境
        root.Poof = root.P = Poof;
    }
}(typeof window !== "undefined" ? window : this));