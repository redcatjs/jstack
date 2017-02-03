jstack.randomColor = function(){
    //var letters = '0123456789ABCDEF';
    //var color = '#';
    //for (var i = 0; i < 6; i++ ) {
        //color += letters[Math.floor(Math.random() * 16)];
    //}
    //return color;
    return '#'+Math.random().toString(16).substr(2,6);
};