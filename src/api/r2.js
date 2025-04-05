import axios from 'axios'
import imageDirMap from '../assets/imageDirMap.generated.json'

const baseUrl = 'https://pub-c422172c6c414e1c825fefb55538d69e.r2.dev'

const actions = {  
  async getArticle (slug) {
    try {  
      // GET /api/:pluralApiId?filters[field][operator]=value
      const response  = await axios.get(`${baseUrl}/articles?filters[slug][$eq]=${slug}`)
      const { data } = response
      if (data && data?.data.length) {
        return data.data[0]
      } else {
        throw new Error('Error finding article')
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {    
        // handle axios error
        console.log(error)
      } else {    
        // handle self defined or unexpected error
        console.log(error)
      }
    }
  },
 
  async listArticles () {
    try {  
      const response = await axios.get(`${baseUrl}/articles?populate=*&sort=date:desc`)
      const { data } = response
      if (data) {
        return data
      } else {
        throw new Error('data not found')
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {    
        // handle axios error
        console.log(error)
      } else {    
        // handle self defined or unexpected error
        console.log(error)
      }
    }
  },

  async listDataset () {
    try {  
      const response = await axios.get(`${baseUrl}/datasets`)
      const { data } = response
      if (data) {
        return data
      } else {
        throw new Error('data not found')
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {    
        // handle axios error
        console.log(error)
      } else {    
        // handle self defined or unexpected error
        console.log(error)
      }
    }
  }
}

const methods = {

}

export default actions