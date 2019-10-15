

exports.sort = function(variations, sortOrder) {
  if(!sortOrder) return variations;
  var list = [];
  for(var i = 0; i < sortOrder.length; i++) {
    var pos = sortOrder[i];
    for(var j = 0; j < variations.length;j++) {
      if(pos == variations[j].id) list.push(variations[j])
    }
  }
    return list || variations;
}
