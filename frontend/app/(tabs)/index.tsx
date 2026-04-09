import { useState, useEffect } from "react";
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, SafeAreaView, Platform, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const API_URL =
  Platform.OS === "web"
    ? "http://localhost:3000/todos"
    : "http://10.0.2.2:3000/todos";

export default function Index() {
  const [todos, setTodos] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [dueDate, setDueDate] = useState("");

  const fetchTodos = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setTodos(data);
    } catch (err) {
      console.error("Error fetching:", err);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const addTodo = async () => {
    if (!text.trim()) return;
    try {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: text,
          due_date: dueDate || null 
        }),
      });
      setText("");
      setDueDate("");
      fetchTodos();
    } catch (err) {
      console.error("Error adding:", err);
    }
  };

  const toggleTodo = async (id: number) => {
    try {
      await fetch(`${API_URL}/${id}`, { method: "PUT" });
      fetchTodos();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTodo = async (id: number) => {
    try {
      await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      fetchTodos();
    } catch (err) {
      console.error(err);
    }
  };

  // Calculate progress
  const completed = todos.filter(t => t.completed).length;
  const total = todos.length;
  const progress = total === 0 ? 0 : (completed / total) * 100;

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "No due date";
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Todo List</Text>
        <Text style={styles.subtitle}>{todos.filter(t => !t.completed).length} Pending</Text>
        
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}% Complete</Text>
        </View>
      </View>

      <FlatList
        data={todos}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity style={styles.itemLeft} onPress={() => toggleTodo(item.id)}>
              <Ionicons 
                name={item.completed ? "checkbox" : "square-outline"} 
                size={24} 
                color={item.completed ? "#4CD964" : "#666"} 
              />
              <View style={{flex: 1}}>
                <Text style={[styles.todoText, item.completed && styles.completedText]}>
                  {item.title}
                </Text>
                <Text style={styles.dueDate}>
                  📅 {formatDate(item.due_date)}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteTodo(item.id)} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        )}
      />

      <View style={styles.inputWrapper}>
        <View style={{flex: 1}}>
          <TextInput
            style={styles.input}
            placeholder="Add a new task..."
            value={text}
            onChangeText={setText}
          />
          <TextInput
            style={[styles.input, styles.dateInput]}
            placeholder="Due date (YYYY-MM-DD)"
            value={dueDate}
            onChangeText={setDueDate}
          />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={addTodo}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
  subtitle: {
    color: "#888",
    marginTop: 5,
    marginBottom: 15,
  },
  progressContainer: {
    marginTop: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4CD964",
  },
  progressText: {
    fontSize: 12,
    color: "#666",
    marginTop: 5,
  },
  listContent: {
    padding: 20,
    paddingBottom: 180,
  },
  card: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  todoText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
  },
  completedText: {
    textDecorationLine: "line-through",
    color: "#aaa",
  },
  dueDate: {
    fontSize: 12,
    color: "#999",
    marginTop: 5,
    marginLeft: 12,
  },
  deleteButton: {
    padding: 5,
  },
  inputWrapper: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  input: {
    backgroundColor: "white",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    fontSize: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 10,
  },
  dateInput: {
    marginBottom: 0,
  },
  addButton: {
    backgroundColor: "#007AFF",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginLeft: 10,
  },
});