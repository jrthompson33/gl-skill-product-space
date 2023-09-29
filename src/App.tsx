import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import { Visualization } from './views/Visualization';

const handleFileFetched = (response: Response) => {
  console.log(response)
  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status}`);
  }
  return response.json();
}

const App = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [metadata, setMetadata] = useState([]);


  useEffect(() => {
    // Load the data here
    Promise.all([
      fetch('./data/nodes_edges.json').then(handleFileFetched),
      fetch('./data/nodes_metadata.json').then(handleFileFetched),
    ])
    .then((files: any[]) => {
      if(files && files.length === 2 && files[0].nodes && files[0].edges) {
        setNodes(files[0].nodes);
        setEdges(files[0].edges);
        setMetadata(files[1]['productHs92'])
      } else {
        console.error('Data not in format expected');
      }
    }).catch((reason) => {
      console.error(reason);
    });


    // Set the data
  }, [])

  console.log(nodes, edges);

  return (
    <div className="App">
      <Visualization nodes={nodes} edges={edges} metadata={metadata} />
    </div>
  );
}

export default App;
