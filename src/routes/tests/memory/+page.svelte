<script lang="ts">
    class Test {
        public arr: any = [];
    }

    let memobj = new Test();
    for (let i = 0; i < 3000; i++) {
        (function () {
            memobj.arr.push(function () {
                doloop();
            });
        })();
    }

    function doloop() {
        const iLen = 2000;
        for (let i = 0; i < iLen; i++) {}
        for (let i = 0; i < iLen; i++) {}
        for (let i = 0; i < iLen; i++) {}
        for (let i = 0; i < iLen; i++) {}
        for (let i = 0; i < iLen; i++) {}
        for (let i = 0; i < iLen; i++) {}
        for (let i = 0; i < iLen; i++) {}
        for (let i = 0; i < iLen; i++) {}
        for (let i = 0; i < iLen; i++) {}
        for (let i = 0; i < iLen; i++) {}
        for (let i = 0; i < iLen; i++) {}
        for (let i = 0; i < iLen; i++) {}
        for (let i = 0; i < iLen; i++) {}
        for (let i = 0; i < iLen; i++) {}
        for (let i = 0; i < iLen; i++) {}
        for (let i = 0; i < iLen; i++) {}
        for (let i = 0; i < iLen; i++) {}
        for (let i = 0; i < iLen; i++) {}
        for (let i = 0; i < iLen; i++) {}
        for (let i = 0; i < iLen; i++) {}
    }
</script>

memory test
