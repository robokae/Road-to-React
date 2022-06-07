import React, 
  { 
    useState, 
    useEffect, 
    useRef, 
    useReducer,
    useCallback
  } from 'react';
import axios from 'axios';

// custom hook to synchronize state with local storage
const useSemiPersistentState = (key, initialState) => {
  const [value, setValue] = useState(
    localStorage.getItem(key) || initialState
  );

  // side effect runs each time the value changes as well as when the 
  // component is initialized
  useEffect(() => {
    // update the value in local storage whenever it changes
    localStorage.setItem(key, value);
  }, [value, key]);

  // return the current value as well as the updater function
  return [value, setValue];
};


const storiesReducer = (state, action) => {
  switch (action.type) {
    case 'STORIES_FETCH_INIT':
      return {
        ...state,
        isLoading: true,
        isError: false,
      }
    case 'STORIES_FETCH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isError: false,
        data: action.payload,
      }
    case 'STORIES_FETCH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isError: true,
      }
    case 'REMOVE_STORY':
      return {
        ...state,
        data: state.data.filter(
          (story) => action.payload.objectID !== story.objectID
        ),
      }
    default:
      throw new Error();
  }
};

const API_ENDPOINT = 'https://hn.algolia.com/api/v1/search?query=';

const App = () => {
  const [searchTerm, setSearchTerm] = useSemiPersistentState('search', '');

  const [url, setUrl] = useState(
    `${API_ENDPOINT}${searchTerm}`
  );

  const [stories, dispatchStories] = useReducer(
    storiesReducer,
    { data: [], isLoading: false, isError: false }
  );

  // useCallback hook is used to create a new function (during a re-render when 
  // the state changes) only when the values in the dependency array changes,
  // which improves efficiency
  const handleFetchStories = useCallback(async () => {
    dispatchStories({ type: 'STORIES_FETCH_INIT' });

    try {
      const result = await axios.get(url);

      dispatchStories({
        type: 'STORIES_FETCH_SUCCESS',
        payload: result.data.hits,
      })
    } catch {
      dispatchStories({ type: 'STORIES_FETCH_FAILURE' });
    }
  }, [url]);

  useEffect(() => {
    // business logic is extracted to a function for reusuability as well as to
    // use in the useCallback hook
    handleFetchStories();
  }, [handleFetchStories]);

  const handleRemoveStory = (item) => {
    // remove the story with the reducer
    dispatchStories({
      type: 'REMOVE_STORY',
      payload: item,
    });
  };

  const handleSearchInput = (event) => {
    // update the search term
    setSearchTerm(event.target.value);
  };

  const handleSearchSubmit = () => {
    // update the endpoint URL
    setUrl(`${API_ENDPOINT}${searchTerm}`);
  };

  return (
    <div>
      <h1>My Hacker Stories</h1>

      <InputWithLabel
        id="search"
        value={searchTerm}
        isFocused
        onInputChange={handleSearchInput}
      >
        <strong>Search:</strong>
      </InputWithLabel>

      <button
        type="button"
        disabled={!searchTerm}
        onClick={handleSearchSubmit}
      >
        Submit
      </button>

      <hr />

      {stories.isError && <p>Something went wrong...</p>}

      {stories.isLoading
        ? (
          <p>Loading...</p>
        )
        : (
          <List
            list={stories.data}
            onRemoveItem={handleRemoveStory}
          />
        )
      }

    </div>
  )
};

const InputWithLabel = ({
  id,
  value,
  type = 'text',
  onInputChange,
  isFocused,
  children,
}) => {
  const inputRef = useRef();

  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isFocused]);

  return (
    <>
      <label htmlFor={id}>{children}</label>
      &nbsp;
      <input
        ref={inputRef}
        id={id}
        type={type}
        value={value}
        onChange={onInputChange}
      />
    </>
  );
};

const List = ({ list, onRemoveItem }) => (
  <ul>
    {list.map((item) => (
      <Item
        key={item.objectID}
        item={item}
        onRemoveItem={onRemoveItem}
      />
    ))}
  </ul>
);

// alternative more concise version using the spread and rest operators
// const List = ({ list }) => (
//   <ul>
//     {list.map(({ objectID, ...item }) => (
//       <Item key={objectID} {...item} />
//     ))}
//   </ul>  
// );

const Item = ({ item, onRemoveItem }) => {
  return (
    <li>
      <span>
        <a href={item.url}>{item.title}</a>
      </span>
      <span>{item.author}</span>
      <span>{item.num_comments}</span>
      <span>{item.points}</span>
      <span>
        <button type="button" onClick={() => onRemoveItem(item)}>
          Dismiss
        </button>
      </span>
    </li>
  );
};

// alternative more concise version using object destructuring
// const Item = ({ title, url, author, num_comments, points }) => (
//   <li>
//     <span>
//       <a href={url}>{title}</a>
//     </span>
//     <span>{author}</span>
//     <span>{num_comments}</span>
//     <span>{points}</span>
//   </li>
// );

export default App;