module.exports = ({
  extend,
  Rcounter,
  Restaurant
}) => {
  
  function getReviews(req, res) {
    var id = req.params.rid;
    Rcounter.findOne(
      {id: id}
      , {'rate.statistics' : 1, '_id' : 0}
      ,function(err, doc){
        if(err){
            res.status(500).json(err);
        }else {
          if(!doc){
            res.status(404).json({message : 'Could not find data.'})
          }else {
            res.json(doc.rate.statistics);
          }
        }
    })
  }

  return {
    getReviews,
  }
};